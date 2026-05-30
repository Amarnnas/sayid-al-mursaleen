import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getLectureBySlugOrId, getYouTubeThumbnail } from '../../../lib/firebase/db'

export const alt = 'محاضرة من مسجد سيد المرسلين'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const decodedSlug = decodeURIComponent(slug)
    const lecture = await getLectureBySlugOrId(decodedSlug)

    const title = lecture?.title || 'محاضرة'
    const sheikh = lecture?.sheikh || 'مسجد سيد المرسلين'
    const thumbnail = lecture?.thumbnailUrl || (lecture?.youtubeUrl ? getYouTubeThumbnail(lecture.youtubeUrl) : '')

    const fontDir = join(process.cwd(), 'public/fonts')
    const [cairoRegular, cairoBold, cairoBlack] = await Promise.all([
      readFile(join(fontDir, 'Cairo-Regular.ttf')),
      readFile(join(fontDir, 'Cairo-Bold.ttf')),
      readFile(join(fontDir, 'Cairo-Black.ttf')),
    ])

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#faf8f5',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: 'Cairo',
            direction: 'rtl',
          }}
        >
          <div style={{ position: 'absolute', top: -150, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(5,150,105,0.15), rgba(5,150,105,0.05))' }} />
          <div style={{ position: 'absolute', bottom: -100, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(5,150,105,0.1), rgba(5,150,105,0.03))' }} />

          <div style={{ height: 8, background: '#059669', width: '100%' }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'row', padding: '40px 60px', gap: 40, alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#059669', backgroundColor: 'rgba(5,150,105,0.1)', padding: '8px 20px', borderRadius: 100, display: 'inline-flex', alignSelf: 'flex-end' }}>
                محاضرة 🔊
              </div>
              <h1 style={{ fontSize: 50, fontWeight: 900, color: '#18181b', lineHeight: 1.3, margin: 0 }}>{title}</h1>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                👤 {sheikh}
              </div>
              <div style={{ fontSize: 20, fontWeight: 400, color: '#71717a', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                مسجد سيد المرسلين
              </div>
            </div>

            <div style={{ width: 280, height: 280, borderRadius: 24, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', border: '3px solid rgba(5,150,105,0.15)' }}>
              <img
                src={thumbnail || 'https://saed-al-mursaleen.web.app/logo.png'}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>

          <div style={{ height: 8, background: '#059669', width: '100%' }} />
        </div>
      ),
      {
        ...size,
        fonts: [
          { name: 'Cairo', data: cairoRegular, weight: 400, style: 'normal' },
          { name: 'Cairo', data: cairoBold, weight: 700, style: 'normal' },
          { name: 'Cairo', data: cairoBlack, weight: 900, style: 'normal' },
        ],
      }
    )
  } catch (e) {
    console.error('OG Image generation error:', e)
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#059669', color: 'white', fontSize: 40, fontFamily: 'sans-serif' }}>
          مسجد سيد المرسلين
        </div>
      ),
      { ...size }
    )
  }
}
