export const inviteHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>ManeJo — You're Invited!</title>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #e8eaf0;
      font-family: 'DM Sans', sans-serif;
      padding: 40px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .email-card {
      width: 100%;
      max-width: 420px;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,0.10);
    }

    .email-header {
      background: linear-gradient(135deg, #0f1b2d 0%, #1a2f4e 100%);
      padding: 36px 28px 32px;
      text-align: center;
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 22px;
    }

    .logo img {
      height: 40px;
    }

    .email-header h2 {
      font-family: 'Sora', sans-serif;
      color: #fff;
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .email-header p {
      color: #8ba3c7;
      font-size: 13px;
    }

    .email-body {
      padding: 28px 28px 36px;
    }

    .badge {
      display: inline-block;
      background: #eef2ff;
      color: #2e6be6;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      padding: 5px 12px;
      border-radius: 20px;
      margin-bottom: 16px;
    }

    .body-text {
      font-size: 13.5px;
      color: #5a6a82;
      line-height: 1.65;
      margin-bottom: 24px;
    }

    .invite-card {
      background: #f7f9ff;
      border: 1.5px solid #dde5f7;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 24px;
    }

    .invite-card-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 18px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e4eaf5;
    }

    .avatar {
      width: 44px;
      height: 44px;
      background: #dde5f7;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .avatar svg { width: 22px; height: 22px; }

    .workspace-name {
      font-size: 10px;
      color: #8ba3c7;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 3px;
    }

    .workspace-title {
      font-family: 'Sora', sans-serif;
      font-size: 15px;
      font-weight: 600;
      color: #0f1b2d;
    }

    .invite-details { display: flex; flex-direction: column; gap: 12px; }

    .detail-row { display: flex; flex-direction: column; gap: 2px; }
    .detail-label { font-size: 11px; color: #8ba3c7; }
    .detail-value { font-size: 13px; font-weight: 600; color: #0f1b2d; }
    .detail-value.message { font-weight: 400; color: #5a6a82; line-height: 1.5; }

    .btn-group {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }

    .btn {
      text-decoration: none;
      flex: 1;
      padding: 13px 10px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      font-family: 'DM Sans', sans-serif;
      cursor: pointer;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      transition: opacity .2s;
    }
    .btn:hover { opacity: .88; }

    .btn-accept {
      background: #2e6be6;
      color: #fff;
    }

    .btn-decline {
      background: #fff;
      color: #e05252;
      border: 1.5px solid #f0d5d5;
    }

    .btn-icon { width: 18px; height: 18px; }

    .expire-note {
      text-align: center;
      font-size: 12px;
      color: #2e6be6;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="email-card">
    <div class="email-header">
      <div class="logo">
        <img src="https://bentojo.com/logo.svg" alt="ManeJo" />
      </div>
      <h2>You're Invited!</h2>
      <p>Join your team and start collaborating<br>with ManeJo</p>
    </div>

    <div class="email-body">
      <div class="badge">Welcome {{name}}</div>
      <p class="body-text"><strong style="color:#0f1b2d">{{inviterName}}</strong> has invited you to join their workspace on ManeJo.</p>

      <div class="invite-card">
        <div class="invite-card-header">
          <div class="avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2e6be6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <p class="workspace-name">{{workspaceName}}</p>
            <p class="workspace-title">ICIT Project Team</p>
          </div>
        </div>

        <div class="invite-details">
          <div class="detail-row">
            <span class="detail-label">Invited By</span>
            <span class="detail-value">{{inviterName}}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Message</span>
            <span class="detail-value message">Hi {{name}}, I'd like to invite you to join our workspace so we can collaborate more effectively</span>
          </div>
        </div>
      </div>

      <div class="btn-group">
        <a href="{{acceptUrl}}" class="btn btn-accept">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Accept Invitation
        </a>
        <a href="{{declineUrl}}" class="btn btn-decline">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          Decline Invitation
        </a>
      </div>

      <p class="expire-note">This invitation will expire in 14 days.</p>
    </div>
  </div>
</body>
</html>`;
