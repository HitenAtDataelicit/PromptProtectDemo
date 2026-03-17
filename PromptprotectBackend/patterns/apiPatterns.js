const XRegExp = require("xregexp");

module.exports = {
    // Highest Priority (10) - Unique Prefixes or Structure
    googleAPIKey: {
        type: "Google API Key",
        pattern: XRegExp('\\b(?:AIZA|aiza|AiZA|aIZA|Aiza|aiZA|AIza|AiZa)[0-9A-Za-z\\-_]{25,43}\\b'),
        priority: 10
    },
    awsAccessID: {
        type: "AWS Access ID Key",
        pattern: XRegExp('\\bAKIA[0-9A-Z]{16}\\b'),
        priority: 10
    },
    ghostAdminAPIKey: {
        type: "Ghost Admin API Key",
        pattern: XRegExp('\\b[0-9a-zA-Z]{24}:[0-9a-fA-F]{64}\\b'),
        priority: 10
    },
    githubPersonalAccessToken: {
        type: "GitHub Personal Access Token (Classic)",
        pattern: XRegExp('(?:^|\\s|[\'"({\\[])(ghp_[a-zA-Z0-9]{36})(?=$|\\s|[\'")},\\]])'),
        priority: 10
    },
    githubFineGrainedToken: {
        type: "GitHub Personal Access Token (Fine-Grained)",
        pattern: XRegExp('(?:^|\\s|[\'"({\\[])(github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59})(?=$|\\s|[\'")},\\]])'),
        priority: 10
    },
    githubOAuthToken: {
        type: "GitHub OAuth 2.0 Access Token",
        pattern: XRegExp('(?:^|\\s|[\'"({\\[])(gho_[a-zA-Z0-9]{36})(?=$|\\s|[\'")},\\]])'),
        priority: 10
    },
    githubUserToServerToken: {
        type: "GitHub User-to-Server Access Token",
        pattern: XRegExp('(?:^|\\s|[\'"({\\[])(ghu_[a-zA-Z0-9]{36})(?=$|\\s|[\'")},\\]])'),
        priority: 10
    },
    githubServerToServerToken: {
        type: "GitHub Server-to-Server Access Token",
        pattern: XRegExp('(?:^|\\s|[\'"({\\[])(ghs_[a-zA-Z0-9]{36})(?=$|\\s|[\'")},\\]])'),
        priority: 10
    },
    githubRefreshToken: {
        type: "GitHub Refresh Token",
        pattern: XRegExp('(?:^|\\s|[\'"({\\[])(ghr_[a-zA-Z0-9]{36})(?=$|\\s|[\'")},\\]])'),
        priority: 10
    },
    gitlabAPIKey: {
        type: "GitLab API Key",
        pattern: XRegExp('(?:\\b|")glpat-[A-Za-z0-9-_]{20}(?:\\b|")'),
        priority: 10
    },
    googleOAuthAccessToken: {
        type: "Google OAuth 2.0 Access Token",
        pattern: XRegExp('\\bya29\\.[0-9A-Za-z-_]+\\b'),
        priority: 10
    },
    herokuAPIKey: {
        type: "Heroku API Key",
        pattern: XRegExp('\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b'),
        priority: 2
    },
    mailchimpAccessToken: {
        type: "MailChimp Access Token",
        pattern: XRegExp('\\b[0-9a-f]{32}-us[0-9]{1,2}\\b'),
        priority: 10
    },
    mailgunAPIKey: {
        type: "Mailgun API Key",
        pattern: XRegExp('\\bkey-[A-Za-z0-9]{32}\\b'),
        priority: 10
    },
    mapboxAPIKey: {
        type: "Mapbox API Key",
        pattern: XRegExp('\\bpk\\.[A-Za-z0-9]{60}\\b'),
        priority: 10
    },
    notionAPIKey: {
        type: "Notion API Key",
        pattern: XRegExp('\\bsecret_[0-9a-zA-Z]{43}\\b'),
        priority: 10
    },
    openAIUserAPIKey: {
        type: "OpenAI User API Key",
        pattern: XRegExp('\\bsk-[a-zA-Z0-9]{48}\\b'),
        priority: 10
    },
    salesforceAccessToken: {
        type: "Salesforce Access Token",
        pattern: XRegExp('\\b00D[a-zA-Z0-9]{15,18}\\b'),
        priority: 10
    },
    sendgridAPIKey: {
        type: "SendGrid API Key",
        pattern: XRegExp('\\bSG\\.[A-Za-z0-9_-]{22}\\.[A-Za-z0-9_-]{43}\\b'),
        priority: 10
    },
    shopifyAccessToken: {
        type: "Shopify Access Token",
        pattern: XRegExp('\\bshpat_[A-Za-z0-9]{32}\\b'),
        priority: 10
    },
    slackAPIToken: {
        type: "Slack API Token",
        pattern: XRegExp('\\bxox[baprs]-[A-Za-z0-9-]{10,48}\\b'),
        priority: 10
    },
    squareAccessToken: {
        type: "Square Access Token",
        pattern: XRegExp('\\bsq0atp-[A-Za-z0-9]{22}\\b'),
        priority: 10
    },
    stripeAPIKey: {
        type: "Stripe API Key",
        pattern: XRegExp('\\bsk_live_[A-Za-z0-9]{24,32}\\b'),
        priority: 10
    },
    telegramBotToken: {
        type: "Telegram Bot Token",
        pattern: XRegExp('\\b[0-9]+:[A-Za-z0-9_-]{35}\\b'),
        priority: 10
    },
    twilioAPIKey: {
        type: "Twilio API Key",
        pattern: XRegExp('\\bSK[A-Za-z0-9]{32}\\b'),
        priority: 10
    },
    twilioSID: {
        type: "Twilio SID",
        pattern: XRegExp('\\bAC[A-Za-z0-9]{32}\\b'),
        priority: 10
    },

    // High Priority (8-9) - Strong Prefixes
    adobeSignAPIKey: {
        type: "Adobe Sign API Key",
        pattern: XRegExp('\\bSIGN-[A-Za-z0-9]{20,25}\\b'),
        priority: 9
    },
    airtableAPIKey: {
        type: "Airtable API Key",
        pattern: XRegExp('\\bkey[A-Za-z0-9]{14}\\b'),
        priority: 9
    },
    amplitudeAPIKey: {
        type: "Amplitude API Key",
        pattern: XRegExp('\\bamp_[A-Za-z0-9]{20,32}\\b'),
        priority: 9
    },
    atlassianAPIKey: {
        type: "Atlassian API Key",
        pattern: XRegExp('\\batl_[a-zA-Z0-9]{24,40}\\b'),
        priority: 9
    },
    digitalOceanAPIKey: {
        type: "DigitalOcean API Key",
        pattern: XRegExp('\\bdo_[A-Za-z0-9]{64}\\b'),
        priority: 9
    },
    facebookAccessToken: {
        type: "Facebook Access Token",
        pattern: XRegExp('\\bEAACEdEose0cBA[0-9A-Za-z]+\\b'),
        priority: 9
    },
    hubspotAPIKey: {
        type: "HubSpot API Key",
        pattern: XRegExp('\\bpat-[a-zA-Z0-9]{32}\\b'),
        priority: 9
    },
    intercomAccessToken: {
        type: "Intercom Access Token",
        pattern: XRegExp('\\bint_[A-Za-z0-9]{64}\\b'),
        priority: 9
    },
    newRelicAPIKey: {
        type: "New Relic API Key",
        pattern: XRegExp('\\bNRRA-[a-zA-Z0-9]{32}\\b'),
        priority: 9
    },
    freshserviceToken: {
        type: "Freshservice Token",
        pattern: XRegExp('\\bfs_[A-Za-z0-9]{32}\\b'),
        priority: 9
    },

    // Medium Priority (4-7) - Mostly Length-Based or Weaker Prefixes
    awsSecretKey: {
        type: "AWS Secret Key",
        pattern: XRegExp('(?:^|\\s|[\'"({\\[])([0-9a-zA-Z/+]{40})(?=$|\\s|[\'")},\\]])'),
        priority: 4
    },
    boxDeveloperToken: {
        type: "Box Developer Token",
        pattern: XRegExp('(?:^|\\s|[\'"({\\[])([A-Za-z0-9_-]{64})(?=$|\\s|[\'")},\\]])'),
        priority: 6
    },
    codaAPIToken: {
        type: "Coda API Token",
        pattern: XRegExp('(?:^|\\s|[\'"({\\[])([A-Za-z0-9]{40})(?=$|\\s|[\'")},\\]])'),
        priority: 4
    },
    dropboxAPIKey: {
        type: "Dropbox API Key",
        pattern: XRegExp('(?:^|\\s|[\'"({\\[])([a-z0-9]{40,50})(?=$|\\s|[\'")},\\]])'),
        priority: 4
    },
    linodeAPIToken: {
        type: "Linode API Token",
        pattern: XRegExp('(?:^|\\s|[\'"({\\[])([A-Za-z0-9]{64})(?=$|\\s|[\'")},\\]])'),
        priority: 6
    },
    googleServiceAccountKey: {
        type: "Google Service Account Key",
        pattern: XRegExp('"type":\\s*"service_account"'),
        priority: 7 // Context-based, not a key itself
    },

    // Low Priority (1-3) - Very Generic
    accuWeatherAPIKey: {
        type: "AccuWeather API Key",
        pattern: XRegExp('(?:^|\\s|[\'"({\\[])([0-9A-Za-z]{32})(?=$|\\s|[\'")},\\]])'),
        priority: 1
    },
    algoliaAPIKey: {
        type: "Algolia API Key",
        pattern: XRegExp('(?:^|\\s|[\'"({\\[])([a-f0-9]{32})(?=$|\\s|[\'")},\\]])'),
        priority: 2 // Hex is more specific than alphanumeric
    },
    agoraAPIKey: {
        type: "Agora API Key",
        pattern: XRegExp('(?:^|\\s|[\'"({\\[])([A-Za-z0-9]{32})(?=$|\\s|[\'")},\\]])'),
        priority: 1
    },
    azureClientID: {
        type: "Azure Client ID",
        pattern: XRegExp('\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b'),
        priority: 2
    },

    ablyAPIKey: { type: "Ably API Key", pattern: XRegExp('\\bably_[a-zA-Z0-9]{32}\\b'), priority: 9 },
    adobeAnalyticsAPIKey: { type: "Adobe Analytics API Key", pattern: XRegExp('\\bAKEY-[A-Za-z0-9]{20,25}\\b'), priority: 9 },
    adobeClientID: { type: "Adobe API Key (Client ID)", pattern: XRegExp('\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b'), priority: 2 },
    amazonAuthToken: { type: "Amazon Auth Token", pattern: XRegExp('\\bamzn\\.mws\\.[0-9a-f]{8}-[0-9a-f]{4}-10-[0-9a-f]{4}-[0-9a-f]{12}\\b'), priority: 10 },
    applePrivateKey: { type: "Apple Private Key", pattern: XRegExp('-----BEGIN PRIVATE KEY-----[A-Za-z0-9+/=\\s]+-----END PRIVATE KEY-----'), priority: 8 },
    autodeskAPIKey: { type: "Autodesk API Key", pattern: XRegExp('\\bads[A-Za-z0-9]{20,32}\\b'), priority: 8 },
    autopilotAPIKey: { type: "Autopilot API Key", pattern: XRegExp('\\bAP-[A-Za-z0-9]{30}\\b'), priority: 9 },
    basecampAPIKey: { type: "Basecamp API Key", pattern: XRegExp('\\bBC[A-Za-z0-9]{24}\\b'), priority: 9 },
    benchlingAPIKey: { type: "Benchling API Key", pattern: XRegExp('\\bbench_[A-Za-z0-9]{32}\\b'), priority: 9 },
    bitbucketAPIKey: { type: "Bitbucket API Key", pattern: XRegExp('\\bbitbucket_[A-Za-z0-9]{20,30}\\b'), priority: 9 },
    bitlyAPIKey: { type: "Bitly API Key", pattern: XRegExp('\\bbt_[A-Za-z0-9]{20}\\b'), priority: 9 },
    calendlyAPIKey: { type: "Calendly API Key", pattern: XRegExp('\\bapi_key-[a-zA-Z0-9]{40}\\b'), priority: 9 },
    ciscoWebexAPIKey: { type: "Cisco Webex API Key", pattern: XRegExp('\\bMC[A-Za-z0-9_-]{20,40}\\b'), priority: 8 },
    clarityAIKey: { type: "Clarity AI API Key", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([a-f0-9]{36})(?=$|\\s|[\'")},\\]])'), priority: 2 },
    clickupAPIKey: { type: "ClickUp API Key", pattern: XRegExp('\\bcl_[A-Za-z0-9]{32}\\b'), priority: 9 },
    cloudflareAPIToken: { type: "Cloudflare API Token", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([A-Fa-f0-9]{32})(?=$|\\s|[\'")},\\]])'), priority: 2 },
    cloudinaryAPIKey: { type: "Cloudinary API Key", pattern: XRegExp('\\bCLOUDK-[A-Za-z0-9_-]{20}\\b'), priority: 9 },
    cockroachDBAPIKey: { type: "CockroachDB API Key", pattern: XRegExp('\\bcockroach_[A-Za-z0-9]{24,40}\\b'), priority: 9 },
    coinbaseAPIKey: { type: "Coinbase API Key", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([a-zA-Z0-9]{32})(?=$|\\s|[\'")},\\]])'), priority: 1 },
    contentfulDeliveryAPIKey: { type: "Contentful Delivery API Key", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([a-zA-Z0-9_-]{43})(?=$|\\s|[\'")},\\]])'), priority: 3 },
    contentstackAPIKey: { type: "Contentstack API Key", pattern: XRegExp('\\bcs_[A-Za-z0-9]{20}\\b'), priority: 9 },
    courierAPIKey: { type: "Courier API Key", pattern: XRegExp('\\bcourier_[a-zA-Z0-9]{50}\\b'), priority: 9 },
    dashlaneAPIKey: { type: "Dashlane API Key", pattern: XRegExp('\\bdashlane_[A-Za-z0-9]{24,}\\b'), priority: 9 },
    datadogAPIKey: { type: "Datadog API Key", pattern: XRegExp('\\bDDOG[a-fA-F0-9]{28}\\b'), priority: 10 },
    dailymotionAPIKey: { type: "Daimotion API Key", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([A-Za-z0-9]{40})(?=$|\\s|[\'")},\\]])'), priority: 1 },
    deezerAPIKey: { type: "Deezer API Key", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([A-Za-z0-9]{32})(?=$|\\s|[\'")},\\]])'), priority: 1 },
    dockerAPIToken: { type: "Docker API Token", pattern: XRegExp('\\bdocker_[A-Za-z0-9]{32}\\b'), priority: 9 },
    dockerHubAPIToken: { type: "Docker Hub API Token", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([0-9A-Za-z_-]{32})(?=$|\\s|[\'")},\\]])'), priority: 1 },
    docusignAPIKey: { type: "Docusign API Key", pattern: XRegExp('\\bDS[A-Za-z0-9]{20}\\b'), priority: 9 },
    driftAPIToken: { type: "Drift API Token", pattern: XRegExp('\\bdrift_[A-Za-z0-9]{40}\\b'), priority: 9 },
    duckduckgoAPIKey: { type: "DuckDuckGo API Key", pattern: XRegExp('\\bduck[A-Za-z0-9]{20}\\b'), priority: 8 },
    ebayAPIKey: { type: "eBay API Key", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([0-9a-zA-Z]{24})(?=$|\\s|[\'")},\\]])'), priority: 1 },
    elasticCloudAPIKey: { type: "Elastic Cloud API Key", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([a-zA-Z0-9]{32})(?=$|\\s|[\'")},\\]])'), priority: 1 },
    envoyAPIKey: { type: "Envoy API Key", pattern: XRegExp('\\benv_[A-Za-z0-9]{40}\\b'), priority: 9 },
    etsyAPIKey: { type: "Etsy API Key", pattern: XRegExp('\\bkey_[A-Za-z0-9]{32}\\b'), priority: 9 },
    eventbriteAPIKey: { type: "Eventbrite API Key", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([A-Za-z0-9]{32})(?=$|\\s|[\'")},\\]])'), priority: 1 },
    expensifyAPIKey: { type: "Expensify API Key", pattern: XRegExp('\\bexp_[A-Za-z0-9]{40}\\b'), priority: 9 },
    facebookGraphAPIToken: { type: "Facebook Graph API Token", pattern: XRegExp('\\bEAAG[a-zA-Z0-9]{30,60}\\b'), priority: 10 },
    figmaAPIToken: { type: "Figma API Token", pattern: XRegExp('\\bfigd_[a-f0-9]{32,64}\\b'), priority: 9 },
    firebaseWebAPIKey: { type: "Firebase Web API Key", pattern: XRegExp('\\bAAAA[A-Za-z0-9_-]{20,50}\\b'), priority: 10 },
    firebaseSecret: { type: "Firebase Secret", pattern: XRegExp('\\bfbase_[A-Za-z0-9]{40}\\b'), priority: 9 },
    flexportAPIKey: { type: "Flexport API Key", pattern: XRegExp('(?<![a-zA-Z0-9])flex[A-Za-z0-9]{20,30}(?![a-zA-Z0-9])'), priority: 8 },
    freshdeskAPIKey: { type: "Freshdesk API Key", pattern: XRegExp('(?<![a-zA-Z0-9])[A-Za-z0-9]{32}(?![a-zA-Z0-9])'), priority: 1 },
    freshserviceAPIKey: { type: "Freshservice API Key", pattern: XRegExp('(?<![a-zA-Z0-9])fs_[A-Za-z0-9]{32}(?![a-zA-Z0-9])'), priority: 9 },
    gitkrakenAPIKey: { type: "GitKraken API Key", pattern: XRegExp('(?:\\b|")krkn_[A-Za-z0-9]{32}(?:\\b|")'), priority: 9 },
    googleOAuthSecretKey: { type: "Google OAuth 2.0 Secret Key", pattern: XRegExp('\\b[0-9a-zA-Z-_]{24}\\b'), priority: 3 },
    googleOAuthAuthCode: { type: "Google OAuth 2.0 Auth Code", pattern: XRegExp('\\b4\\/[0-9A-Za-z-_]+\\b'), priority: 10 },
    googleOAuthRefreshToken: { type: "Google OAuth 2.0 Refresh Token", pattern: XRegExp('\\b1\\/[0-9A-Za-z-]{43}\\b|\\b1\\/[0-9A-Za-z-]{64}\\b'), priority: 10 },
    googleCloudAPIKey: { type: "Google Cloud API Key", pattern: XRegExp('\\b[A-Za-z0-9_]{21}--[A-Za-z0-9_]{8}\\b'), priority: 10 },
    googleCloudOAuthToken: { type: "Google Cloud OAuth 2.0 Token", pattern: XRegExp('\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b'), priority: 2 },
    greenhouseAPIKey: { type: "Greenhouse API Key", pattern: XRegExp('\\bgh[A-Za-z0-9]{32}\\b'), priority: 8 },
    grooveAPIKey: { type: "Groove API Key", pattern: XRegExp('\\bgrv_[A-Za-z0-9]{40}\\b'), priority: 9 },
    hackerrankAPIKey: { type: "HackerRank API Key", pattern: XRegExp('\\bHCKR[a-zA-Z0-9]{32}\\b'), priority: 9 },
    hellosignAPIKey: { type: "HelloSign API Key", pattern: XRegExp('\\bHS[A-Za-z0-9_-]{38}\\b'), priority: 9 },
    honeybookAPIKey: { type: "HoneyBook API Key", pattern: XRegExp('\\bHny[A-Za-z0-9]{30}\\b'), priority: 8 },
    hootsuiteAPIKey: { type: "Hootsuite API Key", pattern: XRegExp('\\bHoot[A-Za-z0-9]{30}\\b'), priority: 8 },
    hubSpotPrivateAppKey: { type: "HubSpot Private App Key", pattern: XRegExp('\\bpat-[A-Za-z0-9]{40}\\b'), priority: 9 },
    ibmCloudAPIKey: { type: "IBM Cloud API Key", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([A-Za-z0-9_-]{64})(?=$|\\s|[\'")},\\]])'), priority: 6 },
    ibmCloudIAMToken: { type: "IBM Cloud IAM Token", pattern: XRegExp('\\bicp4d-[A-Za-z0-9]{32}\\b'), priority: 9 },
    insightlyAPIKey: { type: "Insightly API Key", pattern: XRegExp('\\bins[A-Za-z0-9]{40}\\b'), priority: 8 },
    intercomAPIKey: { type: "Intercom API Key", pattern: XRegExp('\\bic_[A-Za-z0-9]{32}\\b'), priority: 9 },
    instagramOAuthToken: { type: "Instagram OAuth 2.0 Token", pattern: XRegExp('\\b[0-9a-fA-F]{7}\\.[0-9a-fA-F]{32}\\b'), priority: 10 },
    ipinfoAPIKey: { type: "IPinfo API Key", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([A-Za-z0-9]{20})(?=$|\\s|[\'")},\\]])'), priority: 1 },
    itunesAPIKey: { type: "iTunes API Key", pattern: XRegExp('\\bIT-[A-Za-z0-9]{20}\\b'), priority: 9 },
    ivantiAPIKey: { type: "Ivanti API Key", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([a-zA-Z0-9]{24})(?=$|\\s|[\'")},\\]])'), priority: 1 },
    kajabiAPIKey: { type: "Kajabi API Key", pattern: XRegExp('\\bkaj_[A-Za-z0-9]{32}\\b'), priority: 9 },
    keeperAPIKey: { type: "Keeper API Key", pattern: XRegExp('\\bkeeper_[A-Za-z0-9]{32}\\b'), priority: 9 },
    klarnaAPIKey: { type: "Klarna API Key", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([A-Za-z0-9]{32})(?=$|\\s|[\'")},\\]])'), priority: 1 },
    kustomerAPIKey: { type: "Kustomer API Key", pattern: XRegExp('\\bkust_[A-Za-z0-9]{32}\\b'), priority: 9 },
    laterAPIKey: { type: "Later API Key", pattern: XRegExp('\\blater[A-Za-z0-9]{20,30}\\b'), priority: 8 },
    leverAPIKey: { type: "Lever API Key", pattern: XRegExp('\\blever_[A-Za-z0-9]{32}\\b'), priority: 9 },
    luluAPIKey: { type: "Lulu API Key", pattern: XRegExp('\\blulu_[A-Za-z0-9]{32}\\b'), priority: 9 },
    mattermostAccessToken: { type: "Mattermost Access Token", pattern: XRegExp('\\bmatter[A-Za-z0-9]{32}\\b'), priority: 8 },
    microsoftBingAPIKey: { type: "Microsoft Bing Search API Key", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([A-Za-z0-9]{32})(?=$|\\s|[\'")},\\]])'), priority: 1 },
    miroAPIToken: { type: "Miro API Token", pattern: XRegExp('\\bmiro_[A-Za-z0-9]{32}\\b'), priority: 9 },
    mondayAPIKey: { type: "Monday.com API Key", pattern: XRegExp('\\bapi_key=[a-zA-Z0-9]{40}\\b'), priority: 9 },
    moosendAPIKey: { type: "Moosend API Key", pattern: XRegExp('\\bmoose_[A-Za-z0-9]{40}\\b'), priority: 9 },
    netlifyAPIToken: { type: "Netlify API Token", pattern: XRegExp('\\bnet_[A-Za-z0-9]{32}\\b'), priority: 9 },
    nexmoAPIKey: { type: "Nexmo API Key", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([0-9a-zA-Z]{32})(?=$|\\s|[\'")},\\]])'), priority: 1 },
    nexmoApplicationKey: { type: "Nexmo Application Key", pattern: XRegExp('\\bNEXMO_[A-Za-z0-9]{32}\\b'), priority: 9 },
    ninjaFormsAPIKey: { type: "Ninja Forms API Key", pattern: XRegExp('\\bnf_[A-Za-z0-9]{20}\\b'), priority: 9 },
    oktaAPIToken: { type: "Okta API Token", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([0-9a-zA-Z]{40})(?=$|\\s|[\'")},\\]])'), priority: 3 },
    openWeatherMapAPIKey: { type: "OpenWeatherMap API Key", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([A-Za-z0-9]{32})(?=$|\\s|[\'")},\\]])'), priority: 1 },
    pagerDutyAPIToken: { type: "PagerDuty API Token", pattern: XRegExp('\\bpdt_[A-Za-z0-9]{32}\\b'), priority: 9 },
    paypalAccessToken: { type: "Paypal Access Token", pattern: XRegExp('\\b[0-9a-f]{32}\\.[0-9a-f]{32}\\b'), priority: 10 },
    paypalClientID: { type: "PayPal Client ID", pattern: XRegExp('\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b'), priority: 2 },
    pinterestAccessToken: { type: "Pinterest Access Token", pattern: XRegExp('\\bpi_[A-Za-z0-9]{32}\\b'), priority: 9 },
    pipedriveAPIKey: { type: "Pipedrive API Key", pattern: XRegExp('\\bpd_[A-Za-z0-9]{40}\\b'), priority: 9 },
    plivoAPIKey: { type: "Plivo API Key", pattern: XRegExp('\\bplivo_[A-Za-z0-9]{40}\\b'), priority: 9 },
    procoreAPIKey: { type: "Procore API Key", pattern: XRegExp('\\bpcore_[A-Za-z0-9]{40}\\b'), priority: 9 },
    quickbooksAPIKey: { type: "QuickBooks API Key", pattern: XRegExp('\\bqb_[A-Za-z0-9]{32}\\b'), priority: 9 },
    quipAPIKey: { type: "Quip API Key", pattern: XRegExp('\\bquip-[A-Za-z0-9]{32}\\b'), priority: 9 },
    serviceNowAPIKey: { type: "ServiceNow API Key", pattern: XRegExp('\\bsn_[A-Za-z0-9]{32}\\b'), priority: 9 },
    spotifyAccessToken: { type: "Spotify Access Token", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([A-Za-z0-9]{80})(?=$|\\s|[\'")},\\]])'), priority: 6 },
    tableauAPIKey: { type: "Tableau API Key", pattern: XRegExp('\\btab_[A-Za-z0-9]{32}\\b'), priority: 9 },
    twitterBearerToken: { type: "Twitter Bearer Token", pattern: XRegExp('\\bAAAAAAAA[A-Za-z0-9-_]{80}\\b'), priority: 10 },
    typeformAPIKey: { type: "Typeform API Key", pattern: XRegExp('\\btfp_[A-Za-z0-9]{40}\\b'), priority: 9 },
    vimeoAccessToken: { type: "Vimeo Access Token", pattern: XRegExp('\\bvimeo-(?:[A-Za-z0-9]{32}|[A-Za-z0-9]{40})\\b'), priority: 9 },
    vonageAPIKey: { type: "Vonage API Key", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([A-Za-z0-9]{32})(?=$|\\s|[\'")},\\]])'), priority: 1 },
    whatsappAccessToken: { type: "WhatsApp Access Token", pattern: XRegExp('\\bEAAG[A-Za-z0-9]{32,64}\\b'), priority: 10 },
    woocommerceAPIKey: { type: "WooCommerce API Key", pattern: XRegExp('\\b(ck|cs)_[A-Za-z0-9]{32}\\b'), priority: 10 },
    wordpressAPIKey: { type: "Wordpress.com API Key", pattern: XRegExp('\\bwp_[A-Za-z0-9]{40}\\b'), priority: 9 },
    yandexAPIKey: { type: "Yandex API Key", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([A-Za-z0-9]{32})(?=$|\\s|[\'")},\\]])'), priority: 1 },
    zendeskAPIKey: { type: "Zendesk API Key", pattern: XRegExp('\\bZDAPI[A-Za-z0-9]{24}\\b'), priority: 9 },
    zohoAPIKey: { type: "Zoho API Key", pattern: XRegExp('\\bzoho_[A-Za-z0-9]{32}\\b'), priority: 9 },
    zoomAPIKey: { type: "Zoom API Key", pattern: XRegExp('\\bZOOM[A-Za-z0-9]{20,32}\\b'), priority: 8 },
    azureStorageAccountKey: { type: "Azure Storage Account Key", pattern: XRegExp('\\b[A-Za-z0-9+/=]{88}\\b'), priority: 7 },
    baseCRMToken: { type: "Base CRM Token", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([A-Za-z0-9]{40})(?=$|\\s|[\'")},\\]])'), priority: 3 },
    dropboxSecretKey: { type: "Dropbox Secret Key", pattern: XRegExp('(?:^|\\s|[\'"({\\[])([A-Za-z0-9]{64})(?=$|\\s|[\'")},\\]])'), priority: 6 }
};