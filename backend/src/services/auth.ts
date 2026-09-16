export type AuthenticatedUser = {
  id: string;
};

type GoogleUserInfo = {
  sub?: string;
};

const AUTHORIZATION_MESSAGE =
  "Reflection needs permission to identify your Google account. Click Authorize Reflection in the sidebar, approve Google’s prompt, then try again.";

export async function authenticateGoogleUser(
  request: Request,
): Promise<AuthenticatedUser> {
  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error(AUTHORIZATION_MESSAGE);
  }

  const accessToken = authorization.slice("Bearer ".length).trim();

  if (!accessToken) {
    throw new Error(AUTHORIZATION_MESSAGE);
  }

  let response: Response;

  try {
    response = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
  } catch {
    throw new Error(
      "Reflection could not verify your Google permission. Try again in a moment.",
    );
  }

  if (!response.ok) {
    throw new Error(
      "Your Reflection permission needs renewing. Click Authorize Reflection in the sidebar, approve Google’s prompt, then try again.",
    );
  }

  const user = (await response.json()) as GoogleUserInfo;

  if (!user.sub) {
    throw new Error(
      "Reflection could not identify your Google account. Click Authorize Reflection and try again.",
    );
  }

  return { id: user.sub };
}