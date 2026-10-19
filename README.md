# AZ-305 Practice

Run locally with `npm install` and `npm run dev`. Build with `npm run build`.

## Question banks

Add JSON files under `src/questions/`. Vite discovers them at build time, so adding a bank to a deployed app requires a rebuild. The dropdown uses each bank's `title`; banks are listed alphabetically by file path.

Each file has a `title` and a `questions` array. A question has `ques`, `ans` (the IDs of all correct options), `options` (each with a unique `id` and `text`), and `explanation`. The number of IDs in `ans` determines how many choices the user may select; each correctly selected option earns one point.

```json
{
  "title": "AZ-305 · Core architecture",
  "questions": [
    {
      "ques": "Which service provides private connectivity to Azure?",
      "ans": ["expressroute"],
      "options": [
        { "id": "vpn", "text": "Site-to-site VPN" },
        { "id": "expressroute", "text": "<b>Azure ExpressRoute</b>" }
      ],
      "explanation": "<b>Correct: ExpressRoute.</b> It provides private connectivity through a provider."
    }
  ]
}
```

For a choose-two question, use two IDs in `ans`, for example `"ans": ["a", "c"]`. HTML is supported in question, option, and explanation text; only use trusted content.

Unfinished attempts can be saved and resumed from the home screen in the same browser tab. Progress uses `sessionStorage` and does not persist after the tab's session ends.
