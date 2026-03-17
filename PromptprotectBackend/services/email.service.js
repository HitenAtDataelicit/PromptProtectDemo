require("dotenv").config();
const { ConfidentialClientApplication } = require("@azure/msal-node");

const clientID = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const tenantID = process.env.TENANT_ID;

const signup_message = "Thank you for signing up with PromptProtect. To complete your registration and activate you account, please click Verify Now button below."
const signup_timeout = "1 hour"
const signup_message_2 = "Welcome aboard, and thank you for joining PromptProtect! We're excited to have you as part of our community."
const signup_message_3_footer = "you signed up"
const signup_header = "Please Verify Your Email"

const reset_password_message = "We received a request to reset your password for your PromptProtect account. Click the button below to securely set a new password."
const reset_password_timeout = "15 minutes"
const reset_password_message_2 = "If you did not request a password reset, you can safely ignore this email. Your account will remain secure."
const reset_password_3_footer = "you requested to reset password"
const reset_header = "Verification for Reset Password"



async function get_access_token() {
  const authority = `https://login.microsoftonline.com/${tenantID}`;

  const app = new ConfidentialClientApplication({
    auth: {
      clientId: clientID,
      authority,
      clientSecret
    }
  });

  return await app.acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"]
  });
}

async function send_email(to_email, subject, variable, content_type = "HTML", type = "signup") {
  try {
    const tokenResponse = await get_access_token();
    const accessToken = tokenResponse?.accessToken;

    if (!accessToken) {
      throw new Error("Access token missing");
    }
    let message1 = reset_password_message
    let timeout = reset_password_timeout
    let message2 = reset_password_message_2
    let message3 = reset_password_3_footer
    let HeaderMsg = reset_header
    if (type === "signup") {
      message1 = signup_message;
      timeout = signup_timeout;
      message2 = signup_message_2;
      message3 = signup_message_3_footer;
      HeaderMsg = signup_header
    }

    const htmlSignUp = `
        <!DOCTYPE HTML PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<!--[if gte mso 9]>
<xml>
  <o:OfficeDocumentSettings>
    <o:AllowPNG/>
    <o:PixelsPerInch>96</o:PixelsPerInch>
  </o:OfficeDocumentSettings>
</xml>
<![endif]-->
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]-->
  
  
    <style type="text/css">
      
      @media only screen and (min-width: 620px) {
        .u-row {
          width: 600px !important;
        }

        .u-row .u-col {
          vertical-align: top;
        }

        
            .u-row .u-col-100 {
              width: 600px !important;
            }
          
      }

      @media only screen and (max-width: 620px) {
        .u-row-container {
          max-width: 100% !important;
          padding-left: 0px !important;
          padding-right: 0px !important;
        }

        .u-row {
          width: 100% !important;
        }

        .u-row .u-col {
          display: block !important;
          width: 100% !important;
          min-width: 320px !important;
          max-width: 100% !important;
        }

        .u-row .u-col > div {
          margin: 0 auto;
        }

}
    
body{margin:0;padding:0}table,td,tr{border-collapse:collapse;vertical-align:top}.ie-container table,.mso-container table{table-layout:fixed}*{line-height:inherit}a[x-apple-data-detectors=true]{color:inherit!important;text-decoration:none!important}


table, td { color: #000000; } #u_body a { color: #0000ee; text-decoration: underline; } @media (max-width: 480px) { #u_content_image_1 .v-src-width { width: 55% !important; } #u_content_image_1 .v-src-max-width { max-width: 55% !important; } #u_content_heading_1 .v-container-padding-padding { padding: 20px 10px 10px !important; } #u_content_heading_1 .v-font-size { font-size: 26px !important; } #u_content_heading_1 .v-text-align { text-align: center !important; } #u_content_text_3 .v-container-padding-padding { padding: 10px 10px 30px 20px !important; } #u_content_button_1 .v-size-width { width: 85% !important; } #u_content_text_1 .v-container-padding-padding { padding: 10px 10px 30px 20px !important; } #u_content_text_4 .v-container-padding-padding { padding: 10px 10px 50px 20px !important; } #u_content_text_7 .v-container-padding-padding { padding: 10px 10px 30px 20px !important; } }
    </style>
  
  

<!--[if !mso]><!--><link href="https://fonts.googleapis.com/css?family=Montserrat:400,700&display=swap" rel="stylesheet" type="text/css"><link href="https://fonts.googleapis.com/css?family=Open+Sans:400,700&display=swap" rel="stylesheet" type="text/css"><!--<![endif]-->

</head>

<body class="clean-body u_body" style="margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #000000;color: #000000">
  <!--[if IE]><div class="ie-container"><![endif]-->
  <!--[if mso]><div class="mso-container"><![endif]-->
  <table role="presentation" id="u_body" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;min-width: 320px;Margin: 0 auto;background-color: #000000;width:100%" cellpadding="0" cellspacing="0">
  <tbody>
  <tr style="vertical-align: top">
    <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top">
    <!--[if (mso)|(IE)]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background-color: #000000;"><![endif]-->
    
  
  
<div class="u-row-container" style="padding: 0px;background-color: #10131A">
  <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: #10131a;">
    <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
      <!--[if (mso)|(IE)]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: #10131a;"><![endif]-->
      
<!--[if (mso)|(IE)]><td align="center" width="600" style="width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;" valign="top"><![endif]-->
<div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
  <div style="height: 100%;width: 100% !important;">
  <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;"><!--<![endif]-->
  
<table id="u_content_image_1" style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:36px 10px 20px;font-family:arial,helvetica,sans-serif;" align="left">
        
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td class="v-text-align" style="padding-right: 0px; padding-left: 0px; text-align: center;" align="center"><a href="https://dataelicit.com" target="_blank">
      <img align="center" border="0" src="https://dataelicit.com/wp-content/uploads/2025/09/cropped-Data-Elicit-logo-PNG-scaled-1-300x146.png" alt="Logo" title="Logo" style="outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;clear: both;display: inline-block !important;border: none;height: auto;float: none;width: 31%;max-width: 179.8px;" width="179.8" class="v-src-width v-src-max-width"/>
      </a>
    </td>
  </tr>
</table>

      </td>
    </tr>
  </tbody>
</table>

<table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:10px 0px;font-family:arial,helvetica,sans-serif;" align="left">
        
  <table role="presentation" aria-label="divider" height="0px" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;border-top: 1px solid #5f5e5e;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
    <tbody>
      <tr style="vertical-align: top">
        <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;font-size: 0px;line-height: 0px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
          <span>&#160;</span>
        </td>
      </tr>
    </tbody>
  </table>

      </td>
    </tr>
  </tbody>
</table>

<table id="u_content_heading_1" style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:7px 30px 20px;font-family:arial,helvetica,sans-serif;" align="left">
        
  <!--[if mso]><table role="presentation" width="100%"><tr><td><![endif]-->
    <h1 class="v-text-align v-font-size" style="margin: 0px; color: #ffffff; line-height: 140%; text-align: center; word-wrap: break-word; font-family: 'Open Sans',sans-serif; font-size: 33px; font-weight: 400;"><strong>${HeaderMsg}</strong></h1>
  <!--[if mso]></td></tr></table><![endif]-->

      </td>
    </tr>
  </tbody>
</table>

<table id="u_content_text_3" style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:10px 60px 30px;font-family:arial,helvetica,sans-serif;" align="left">
        
  <div class="v-text-align v-font-size" style="font-size: 14px; color: #ffffff; line-height: 160%; text-align: left; word-wrap: break-word;">
    <p style="line-height: 160%; margin: 0px;"><span data-teams="true" style="line-height: 28.8px; font-family: Montserrat, sans-serif; font-size: 18px;">${message1}</span></p>
  </div>

      </td>
    </tr>
  </tbody>
</table>

<table id="u_content_button_1" style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:10px 10px 30px;font-family:arial,helvetica,sans-serif;" align="left">
        
  <!--[if mso]><style>.v-button {background: transparent !important;}</style><![endif]-->
<div class="v-text-align" align="center">
        
        <br/><br/>
  <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://unlayer.com" style="height:58px; v-text-anchor:middle; width:290px;" arcsize="20.5%"  stroke="f" fillcolor="#2189c7"><w:anchorlock/><center style="color:#FFFFFF;"><![endif]-->
      <a href="${variable}" target="_blank" class="v-button v-size-width v-font-size" style="box-sizing: border-box; display: inline-block; text-decoration: none; text-size-adjust: none; text-align: center; color: rgb(255, 255, 255); background: rgb(33, 137, 199); border-radius: 12px; width: 50%; max-width: 100%; word-break: break-word; overflow-wrap: break-word; font-size: 14px; line-height: inherit;"><span style="display:block;padding:18px 40px;line-height:120%;"><span style="font-family: Montserrat, sans-serif; line-height: 16.8px;"><strong><span style="font-size: 18px; line-height: 21.6px;">Verify Now</span></strong></span></span>
      </a>
    <!--[if mso]></center></v:roundrect><![endif]-->
</div>

      </td>
    </tr>
  </tbody>
</table>

<table id="u_content_text_1" style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:10px 60px 30px;font-family:arial,helvetica,sans-serif;" align="left">
        
      <a style="color: #2189c7">${variable}</a>
      
  <div class="v-text-align v-font-size" style="font-size: 14px; color: #ffffff; line-height: 190%; text-align: left; word-wrap: break-word;">
    <p style="font-size: 14px; line-height: 190%; margin: 0px;"><span style="font-family: Montserrat, sans-serif; line-height: 26.6px;"><span data-teams="true" style="line-height: 26.6px;">Copy Above link in case if Verify Now button doesn't work. The verification link&nbsp; will expire in ${timeout} for security reasons. If you encounter any issues or have questions, feel free to contact our support team at <a style="color: #2189c7" rel="noopener" href="mailto:support@promptprotect.com" target="_blank">support@promptprotect.com</a></span></span></p>
<p style="font-size: 14px; line-height: 190%; margin: 0px;">&nbsp;</p>
<p style="font-size: 14px; line-height: 190%; margin: 0px;"><span style="font-family: Montserrat, sans-serif; line-height: 26.6px;"><span data-teams="true" style="line-height: 26.6px;">${message2}</span> </span></p>
  </div>
 
      </td>
    </tr>
  </tbody>
</table>
 
<table id="u_content_text_4" style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:10px 60px 50px;font-family:arial,helvetica,sans-serif;" align="left">
        
  <div class="v-text-align v-font-size" style="font-size: 14px; color: #ffffff; line-height: 170%; text-align: left; word-wrap: break-word;">
    <p style="font-size: 14px; line-height: 170%; margin: 0px;"><span style="font-family: Montserrat, sans-serif; line-height: 23.8px;"><strong><span style="font-size: 18px; line-height: 30.6px;"><span style="line-height: 30.6px; font-size: 18px;">With Regards,</span></span></strong></span></p>
<p style="font-size: 14px; line-height: 170%; margin: 0px;"><span style="font-size: 18px; line-height: 30.6px; font-family: Montserrat, sans-serif;"><span style="line-height: 30.6px; font-size: 18px;">Technical Support,</span></span></p>
<p style="font-size: 14px; line-height: 170%; margin: 0px;"><span style="font-size: 18px; line-height: 30.6px; font-family: Montserrat, sans-serif;"><span style="line-height: 30.6px; font-size: 18px;">PromptProtect</span></span></p>
  </div>

      </td>
    </tr>
  </tbody>
</table>

<table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:10px 0px;font-family:arial,helvetica,sans-serif;" align="left">
        
  <table role="presentation" aria-label="divider" height="0px" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;table-layout: fixed;border-spacing: 0;mso-table-lspace: 0pt;mso-table-rspace: 0pt;vertical-align: top;border-top: 1px solid #5f5e5e;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
    <tbody>
      <tr style="vertical-align: top">
        <td style="word-break: break-word;border-collapse: collapse !important;vertical-align: top;font-size: 0px;line-height: 0px;mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%">
          <span>&#160;</span>
        </td>
      </tr>
    </tbody>
  </table>

      </td>
    </tr>
  </tbody>
</table>

<table id="u_content_text_7" style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:10px 60px 30px;font-family:arial,helvetica,sans-serif;" align="left">
        
  <div class="v-text-align v-font-size" style="font-size: 14px; color: #ffffff; line-height: 190%; text-align: left; word-wrap: break-word;">
    <p style="font-size: 14px; line-height: 190%; text-align: center; margin: 0px;"><strong><span style="font-family: Montserrat, sans-serif; line-height: 34.2px; font-size: 18px;"><span data-teams="true" style="line-height: 34.2px;">Contact Us: <a style="color: #2189c7" href="mailto:support@promptprotect.com">support@promptprotect.com</a></span></span></strong></p>
  </div>

      </td>
    </tr>
  </tbody>
</table>

  <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
  </div>
</div>
<!--[if (mso)|(IE)]></td><![endif]-->
      <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
    </div>
  </div>
  </div>
  


  
  
<div class="u-row-container" style="padding: 0px;background-color: transparent">
  <div class="u-row" style="margin: 0 auto;min-width: 320px;max-width: 600px;overflow-wrap: break-word;word-wrap: break-word;word-break: break-word;background-color: transparent;">
    <div style="border-collapse: collapse;display: table;width: 100%;height: 100%;background-color: transparent;">
      <!--[if (mso)|(IE)]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0px;background-color: transparent;" align="center"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:600px;"><tr style="background-color: transparent;"><![endif]-->
      
<!--[if (mso)|(IE)]><td align="center" width="600" style="width: 600px;padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;" valign="top"><![endif]-->
<div class="u-col u-col-100" style="max-width: 320px;min-width: 600px;display: table-cell;vertical-align: top;">
  <div style="height: 100%;width: 100% !important;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;">
  <!--[if (!mso)&(!IE)]><!--><div style="box-sizing: border-box; height: 100%; padding: 0px;border-top: 0px solid transparent;border-left: 0px solid transparent;border-right: 0px solid transparent;border-bottom: 0px solid transparent;border-radius: 0px;-webkit-border-radius: 0px; -moz-border-radius: 0px;"><!--<![endif]-->
  
<table style="font-family:arial,helvetica,sans-serif;" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
  <tbody>
    <tr>
      <td class="v-container-padding-padding" style="overflow-wrap:break-word;word-break:break-word;padding:20px 10px 30px;font-family:arial,helvetica,sans-serif;" align="left">
        
  <div class="v-text-align v-font-size" style="font-size: 14px; color: #ced4d9; line-height: 140%; text-align: center; word-wrap: break-word;">
    <p style="font-size: 14px; line-height: 140%; margin: 0px;"><span style="font-family: arial, helvetica, sans-serif; font-size: 14px; line-height: 19.6px;"><span style="line-height: 19.6px;" data-teams="true">You're receiving this email because ${message3} at <a href="https://promptprotect.com" style="color: #2189c7">promptprotect.com<a></span></span></p>
<p style="font-size: 14px; line-height: 140%; margin: 0px;">&nbsp;</p>
<p style="font-size: 14px; line-height: 140%; margin: 0px;"><span style="font-family: arial, helvetica, sans-serif; font-size: 12px; line-height: 16.8px;">&copy; 2026 PromptProtect. All Rights Reserved.</span></p>
  </div>

      </td>
    </tr>
  </tbody>
</table>

  <!--[if (!mso)&(!IE)]><!--></div><!--<![endif]-->
  </div>
</div>
<!--[if (mso)|(IE)]></td><![endif]-->
      <!--[if (mso)|(IE)]></tr></table></td></tr></table><![endif]-->
    </div>
  </div>
  </div>
  


    <!--[if (mso)|(IE)]></td></tr></table><![endif]-->
    </td>
  </tr>
  </tbody>
  </table>
  <!--[if mso]></div><![endif]-->
  <!--[if IE]></div><![endif]-->
</body>

</html>

    `;

    const response = await fetch(
      "https://graph.microsoft.com/v1.0/users/no-reply@dataelicit.com/sendMail",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: {
            subject,
            body: {
              contentType: content_type,
              content: htmlSignUp
            },
            toRecipients: [
              { emailAddress: { address: to_email } }
            ]
          },
          saveToSentItems: false
        })
      }
    );

    if (response.status !== 202) {
      const err = await response.text();
      console.error("Graph error:", err);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Email send failed:", err.message);
    return false;
  }
}



async function send_email_recieve(to_email, subject, html_body, content_type = "HTML") {
  try {
    const tokenResponse = await get_access_token();
    const accessToken = tokenResponse?.accessToken;

    if (!accessToken) {
      throw new Error("Access token missing");
    }

    const html = html_body;

    const response = await fetch(
      "https://graph.microsoft.com/v1.0/users/no-reply@dataelicit.com/sendMail",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: {
            subject,
            body: {
              contentType: content_type,
              content: html
            },
            toRecipients: [
              { emailAddress: { address: to_email } }
            ]
          },
          saveToSentItems: false
        })
      }
    );

    if (response.status !== 202) {
      const err = await response.text();
      console.error("Graph error:", err);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Email send failed:", err.message);
    return false;
  }
}
module.exports = { send_email, send_email_recieve };
