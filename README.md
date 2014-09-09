# Google Calendar AnyFetch Provider
> Visit http://anyfetch.com for details about AnyFetch.

AnyFetch provider for events stored in Google Calendar.

# How to install?
`git clone`, then `npm install`.

You'll need to define some environment variables

```shell
# Go to https://code.google.com/apis/console/b/0/?pli=1#access to ask from app id and secret
export GCALENDAR_API_ID={google-app-id}
export GCALENDAR_API_SECRET={google-app-secret}

# Callback after google consent, most probably http://your-host
PROVIDER_URL="http://your-host"

# AnyFetch app id and secret
export ANYFETCH_API_ID={anyfetch-app-id}
export ANYFETCH_API_SECRET={anyfetch-app-secret}

# See below for details
export GCALENDAR_TEST_REFRESH_TOKEN={refresh-token}
```

# How does it works?
Fetch API will call `/init/connect` with anyFetch authorization code. The user will be transparently redirected to Google consentment page.
Google will then call us back on `/init/callback` with a `code` parameter. We'll trade the `code` for an `access_token` and a `refresh_token` and store it in the database, along with AnyFetch tokens.

We can now sync data between Google and AnyFetch.

This is where the `/update` endpoint comes into play.
Every time `/update` is called, the function will retrieve, all the contacts modified since the last run, and upload the data to AnyFetch.
Deleted contacts will also be deleted from AnyFetch.

# How to test?
Unfortunately, testing this module is not easy.
This project is basically a simple bridge between Google and AnyFetch, so testing requires tiptoeing with the network and Google Server / AnyFetch server.

Before running the test suite, you'll need to do:

```
> node test-auth.js
```

Follow the link in your browser with your Google Account. You'll be redirected to `localhost` (server is not running, so you'll get an error). Copy-paste the `code` parameter in your shell (in the URL, after /init/callback), then save the token as `GCALENDAR_TEST_REFRESH_TOKEN` environment variable.

> Warning: a refresh token is only displayed once. If you get it wrong for some reason, you'll need to clear the permission for your app on https://www.google.com/settings/u/1/security

> Warning: the test suite for Travis includes a secured token to some test account. It won't be used for PR however.

Support: `support@anyfetch.com`.
