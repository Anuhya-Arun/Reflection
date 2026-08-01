const API_URL = "http://localhost:8787";

export async function reviewApplication(
  opportunity: string,
  application: string
) {
  console.log("Sending review request...", {
    opportunity,
    application,
  });

  const response = await fetch(
    `${API_URL}/review`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        opportunity,
        application,
      }),
    }
  );

  console.log("Backend response status:", response.status);

  const data = await response.json();

  console.log("Backend response:", data);

  if (!response.ok) {
    throw new Error(
      "Review request failed"
    );
  }

  return data;
}