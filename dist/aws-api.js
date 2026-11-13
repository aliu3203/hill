(function () {
  const config = window.HILL_CONFIG || {};
  const enabled = Boolean(config.graphqlUrl && config.apiKey);
  const auth = window.HillAuth;

  // Signed in: send the Cognito ID token so AppSync knows which student this is.
  // Signed out: send the API key, which can only browse events.
  async function graphql(query, variables, { requireLogin = false } = {}) {
    if (!enabled) throw new Error("AWS backend is not configured.");
    const token = auth?.enabled ? await auth.getIdToken() : null;
    if (requireLogin && !token) {
      const error = new Error("Sign in with your UCLA email to do that.");
      error.code = "LOGIN_REQUIRED";
      throw error;
    }
    const headers = { "content-type": "application/json" };
    if (token) headers.authorization = token;
    else headers["x-api-key"] = config.apiKey;
    const response = await fetch(config.graphqlUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });
    const payload = await response.json();
    if (!response.ok || payload.errors?.length) throw new Error(payload.errors?.[0]?.message || `GraphQL request failed (${response.status}).`);
    return payload.data;
  }

  async function listEvents(category) {
    const data = await graphql(`query ListEvents($category:String){listEvents(category:$category,limit:40){items{id title time clock startsAt location distance category description people source createdAt}}}`, { category: category || null });
    return data.listEvents.items;
  }

  async function createHangout(input) {
    const data = await graphql(`mutation CreateHangout($input:CreateHangoutInput!){createHangout(input:$input){id title time clock startsAt location distance category description people source createdAt}}`, { input }, { requireLogin: true });
    return data.createHangout;
  }

  async function askHill(message) {
    const data = await graphql(`query AskHill($message:String!){askHill(message:$message){answer eventIds}}`, { message }, { requireLogin: true });
    return data.askHill;
  }

  async function uploadFlyer(file) {
    const data = await graphql(`mutation Upload($fileName:String!,$contentType:String!){createFlyerUpload(fileName:$fileName,contentType:$contentType){uploadUrl objectKey expiresIn}}`, { fileName: file.name, contentType: file.type }, { requireLogin: true });
    const result = data.createFlyerUpload;
    const response = await fetch(result.uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
    if (!response.ok) throw new Error(`Flyer upload failed (${response.status}).`);
    return result;
  }

  async function updatePreferences(interests, alertsEnabled) {
    const data = await graphql(`mutation Preferences($input:PreferencesInput!){updatePreferences(input:$input){userId interests alertsEnabled updatedAt}}`, { input: { interests, alertsEnabled } }, { requireLogin: true });
    return data.updatePreferences;
  }

  window.HillApi = { enabled, listEvents, createHangout, askHill, uploadFlyer, updatePreferences };
})();
