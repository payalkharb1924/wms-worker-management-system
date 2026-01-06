export const otpEmailTemplate = ({ name = "User", otp }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OTP Verification</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 12px;">
        
        <!-- Card -->
        <table width="100%" max-width="420" cellpadding="0" cellspacing="0"
          style="max-width:420px; background:#ffffff; border-radius:14px; padding:28px; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

          <!-- Logo / App Name -->
          <tr>
            <td align="center" style="padding-bottom:12px;">
              <h2 style="margin:0; color:#ff7a00;">WMS</h2>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding-bottom:10px;">
              <h3 style="margin:0; color:#111; font-size:20px;">
                Verify your email
              </h3>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding-bottom:20px; color:#555; font-size:14px; line-height:1.6;">
              Hi ${name},<br/><br/>
              Use the OTP below to reset your password. This code is valid for
              <strong>10 minutes</strong>.
            </td>
          </tr>

          <!-- OTP Box -->
          <tr>
            <td align="center" style="padding:20px 0;">
              <div style="
                font-size:28px;
                letter-spacing:6px;
                font-weight:bold;
                color:#ff7a00;
                background:#fff4e8;
                padding:14px 20px;
                border-radius:10px;
                display:inline-block;
              ">
                ${otp}
              </div>
            </td>
          </tr>

          <!-- Warning -->
          <tr>
            <td style="padding-top:12px; color:#777; font-size:13px; line-height:1.5;">
              ⚠️ Do not share this OTP with anyone.  
              WMS will never ask you for your OTP.
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:26px; font-size:12px; color:#999;">
              If you didn’t request this, you can safely ignore this email.<br/><br/>
              — Team WMS
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
