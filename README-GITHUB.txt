HUNAR V54 FINAL AUTH REPAIR

Upload the CONTENTS of this folder to the root of the existing GitHub Pages repository.
Do NOT create a new domain.

Main site:
https://hunar-maker.github.io/hunarii/

Admin:
https://hunar-maker.github.io/hunarii/admin/

FREELANCER SIGNUP REPAIR:
The freelancer onboarding database function was corrected so ordinary signup does not create an incomplete identity-verification request. Identity verification is completed later from the Verify Identity page.

GOOGLE SIGN-IN:
Google OAuth is configured in the frontend to return to the existing published HUNAR site:
https://hunar-maker.github.io/hunarii/#auth-callback
This also prevents a downloaded file:// copy from trying to use file:// as the OAuth callback.

SUPABASE ONE-TIME SETTINGS:
1. Open Supabase Dashboard for the HUNAR project.
2. Authentication -> URL Configuration.
3. Site URL: https://hunar-maker.github.io/hunarii/
4. Redirect URLs: add https://hunar-maker.github.io/hunarii/
5. Authentication -> Providers -> Google: make sure Google is Enabled and the Google Client ID/Secret are configured.
6. Save.

IMPORTANT:
Use the existing GitHub Pages domain. No new domain is required.
After uploading, hard refresh the published site (Ctrl+F5).
