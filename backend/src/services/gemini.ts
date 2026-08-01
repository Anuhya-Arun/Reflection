// export async function generateReview(prompt: string, env: Env) {
//   const response = await fetch(
//     `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
//     {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         contents: [
//           {
//             parts: [
//               {
//                 text: prompt,
//               },
//             ],
//           },
//         ],
//       }),
//     }
//   );

//   if (!response.ok) {
//     const error = await response.text();

//     console.log("Gemini error:", error);

//     throw new Error(
//         `Gemini failed: ${response.status} ${error}`
//     );
//   }

//   const data = await response.json();

//   return data.candidates[0].content.parts[0].text;
// }


export async function generateReview(prompt: string, env: Env) {

  return JSON.stringify({
    score: 85,
    strengths: [
      "React experience matches the role"
    ],
    weaknesses: [
      "No backend experience mentioned"
    ],
    missingSkills: [
      "Testing knowledge"
    ],
    suggestions: [
      "Add project impact metrics"
    ]
  });

}