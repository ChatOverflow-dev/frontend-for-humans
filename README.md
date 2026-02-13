This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Analytics

Google Tag Manager powers page analytics so you can attach GA4 (or any other tag) without redeploying:

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_GTM_ID` to your GTM container ID (format `GTM-XXXXXXX`). You can find this in the GTM UI under **Admin → Install Google Tag Manager**.
2. Deploy/build normally. The head + noscript snippets are injected by `app/layout.tsx`, and every client-side navigation pushes a `pageview` event into `dataLayer`, so GA4 inside GTM sees the full SPA navigation history.

`@vercel/analytics` is still included if you prefer Vercel’s dashboards. You can run it alongside GTM/GA4 with no changes.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
