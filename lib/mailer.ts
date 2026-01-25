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


export async function sendExpenseReminderEmail({
  to,
  title,
  amount,
  dueDate,
  daysLeft
}: {
  to: string
  title: string
  amount: number
  dueDate: string
  daysLeft: number
}): Promise<'sent' | 'skipped' | 'failed'> {
  if (!transporter || !from) {
    return 'skipped'
  }

  try {
    const formattedAmount = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
    const formattedDate = new Date(dueDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    const subject = daysLeft === 0
      ? `Rappel : Échéance "${title}" aujourd'hui`
      : `Rappel : Échéance "${title}" dans ${daysLeft} jours`

    const dayText = daysLeft === 0
      ? "C'est le jour J !"
      : `Elle arrive à échéance dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}.`

    await transporter.sendMail({
      from,
      to,
      subject,
      text: `Bonjour,

Ceci est un rappel automatique pour votre échéance "${title}" de ${formattedAmount}.
${dayText}
Date : ${formattedDate}

Pensez à vérifier votre compte !

L'équipe BudgetWise`,
      html: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">Rappel d'échéance</h2>
  <p>Bonjour,</p>
  <p>Ceci est un rappel automatique pour votre échéance :</p>
  
  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin: 0 0 10px 0; font-size: 18px;">${title}</h3>
    <p style="margin: 0; font-size: 24px; font-weight: bold; color: #1f2937;">${formattedAmount}</p>
    <p style="margin: 10px 0 0 0; color: #4b5563;">📅 ${formattedDate}</p>
  </div>

  <p><strong>${dayText}</strong></p>
  
  <p>Pensez à vérifier votre compte pour assurer le bon traitement de cette opération.</p>
  
  <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
    Cet email a été envoyé automatiquement par BudgetWise.
  </p>
</div>`
    })
    return 'sent'
  } catch (error) {
    console.error('Error sending reminder email', error)
    return 'failed'
  }
}

export async function sendPinResetEmail({
  to,
  resetCode,
  name
}: {
  to: string
  resetCode: string
  name: string
}): Promise<'sent' | 'skipped' | 'failed'> {
  if (!transporter || !from) {
    return 'skipped'
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject: 'Réinitialisation de votre code PIN BudgetWise',
      text: `Bonjour ${name},

Vous avez demandé la réinitialisation de votre code PIN.
Voici votre code de vérification : ${resetCode}

Ce code est valable 15 minutes.

Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.

L'équipe BudgetWise`,
      html: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">Réinitialisation du code PIN</h2>
  <p>Bonjour <strong>${name}</strong>,</p>
  <p>Vous avez demandé la réinitialisation de votre code PIN BudgetWise.</p>
  
  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <p style="margin: 0; font-size: 14px; color: #4b5563;">Votre code de vérification</p>
    <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${resetCode}</p>
  </div>

  <p>Ce code est valable <strong>15 minutes</strong>.</p>
  
  <p style="color: #6b7280; font-size: 14px;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité.</p>
  
  <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
    Cet email a été envoyé automatiquement par BudgetWise.
  </p>
</div>`
    })
    return 'sent'
  } catch (error) {
    console.error('Error sending PIN reset email', error)
    return 'failed'
  }
}
