import nodemailer from 'nodemailer'

const host = process.env.SMTP_HOST
const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
const user = process.env.SMTP_USER
const pass = process.env.SMTP_PASS
const from = process.env.SMTP_FROM || user

let transporter: nodemailer.Transporter | null = null

if (host && port && user && pass && from) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  })
}

export async function sendShareInviteEmail({
  to,
  accountName,
  ownerName,
  accessCode,
  link,
  role
}: {
  to: string
  accountName: string
  ownerName?: string | null
  accessCode: string
  link: string
  role: 'editor' | 'viewer'
}): Promise<'sent' | 'skipped' | 'failed'> {
  if (!transporter || !from) {
    return 'skipped'
  }

  try {
    const roleText = role === 'editor' ? 'Éditeur (peut ajouter/modifier)' : 'Lecteur (consultation)'
    await transporter.sendMail({
      from,
      to,
      subject: `Invitation à rejoindre le compte joint "${accountName}"`,
      text: `Bonjour,

${ownerName || 'Un membre de BudgetWise'} vous invite à rejoindre le compte "${accountName}".

Rôle attribué : ${roleText}
Code d'accès commun : ${accessCode}

Pour accepter l'invitation, cliquez sur le lien suivant : ${link}

À bientôt sur BudgetWise !`,
      html: `<p>Bonjour,</p>
<p><strong>${ownerName || 'Un membre de BudgetWise'}</strong> vous invite à rejoindre le compte <strong>${accountName}</strong>.</p>
<ul>
  <li>Rôle attribué : <strong>${roleText}</strong></li>
  <li>Code d'accès commun : <strong style="letter-spacing:2px;">${accessCode}</strong></li>
</ul>
<p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Accepter l'invitation</a></p>
<p>À bientôt sur <strong>BudgetWise</strong> !</p>`
    })
    return 'sent'
  } catch (error) {
    console.error('Error sending share invite email', error)
    return 'failed'
  }
}

