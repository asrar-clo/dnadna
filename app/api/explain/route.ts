import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canExplain, logUsage } from '@/lib/usage';
import { fetchUrlAsText, isValidHttpUrl, ExtractError } from '@/lib/extract';
import { explainText, explainPdf, explainImage, explainAudio } from '@/lib/ai';

const MAX_TEXT_CHARS = 20000;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Please log in to continue.' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  const plan = profile?.plan ?? 'free';

  let allowed: boolean;
  try {
    allowed = await canExplain(supabase, user.id, plan);
  } catch {
    return NextResponse.json({ error: 'Something went wrong checking your usage. Try again.' }, { status: 500 });
  }

  if (!allowed) {
    return NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 402 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: 'We couldn\u2019t read that request. Try again.' }, { status: 400 });
  }

  const text = (form.get('text') as string | null)?.trim() || '';
  const url = (form.get('url') as string | null)?.trim() || '';
  const file = form.get('file') as File | null;

  if (!text && !url && !file) {
    return NextResponse.json({ error: 'Paste some text, a link, or upload a file first.' }, { status: 400 });
  }

  try {
    let result;

    if (file) {
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: 'That file is too large (max 10MB).' }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');

      if (file.type === 'application/pdf') {
        result = await explainPdf(base64);
      } else if (file.type.startsWith('image/')) {
        result = await explainImage(base64, file.type);
      } else if (file.type.startsWith('audio/')) {
        result = await explainAudio(base64, file.type);
      } else {
        return NextResponse.json({ error: 'Unsupported file type. Upload a PDF, image, or audio file.' }, { status: 400 });
      }
    } else if (url) {
      if (!isValidHttpUrl(url)) {
        return NextResponse.json({ error: 'That doesn\u2019t look like a valid web link.' }, { status: 400 });
      }
      const pageText = await fetchUrlAsText(url);
      result = await explainText(pageText);
    } else {
      const trimmed = text.slice(0, MAX_TEXT_CHARS);
      result = await explainText(trimmed);
    }

    await logUsage(supabase, user.id, 'success');
    return NextResponse.json({ result });
  } catch (err) {
    await logUsage(supabase, user.id, 'error').catch(() => {});

    if (err instanceof ExtractError) {
      return NextResponse.json({ error: err.userMessage }, { status: 400 });
    }

    console.error('explain_failed', err);
    return NextResponse.json(
      { error: 'We couldn\u2019t generate an explanation. Please try again in a moment.' },
      { status: 500 }
    );
  }
}
