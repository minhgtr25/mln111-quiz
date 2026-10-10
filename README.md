# MLN111 Pro Exam Master

Vanilla JavaScript study app for MLN111. The app is split into focused browser scripts and deploys as a static site on Vercel; it does not need a Node server.

## Project layout

- `index.html`: page structure and styles.
- `css/app.css`: responsive layout and accessibility polish for desktop and mobile.
- `js/rules.js`: the ten rule/tip definitions and matcher functions.
- `js/database.js`: Supabase question loading, local fallback, TXT/JSON import, and progress state.
- `js/practice.js`: practice flow, response feedback, and saved study progress.
- `js/rule-hub.js`: rule hub and each rule's linked question list.
- `js/navigation.js`: filters, flashcards, mock exam, and question browser.
- `js/interactions.js`: search, keyboard controls, theme, and startup.
- `js/cloud-sync.js`: email authentication, cloud progress sync, and realtime updates.
- `supabase/`: schema and seed scripts for the question bank, rules, rule-question links, and account progress.
- `questions.json`: fallback data during local development or while Supabase is unavailable.

## Populate Supabase

The project already has the `user_progress` table for authenticated study progress. Run these scripts in the Supabase SQL Editor, in order:

1. Run all of `supabase/schema.sql` (safe to rerun; it creates the question bank tables and read policies).
2. Run `supabase/seed_rules.sql`.
3. Run `supabase/seed_questions.sql`.
4. Run `supabase/seed_rule_questions.sql`.

This loads 533 questions, their answer choices, 10 rules, and the question-to-rule relationships generated from the current rule matchers. Verify with:

```sql
select
  (select count(*) from public.questions) as questions,
  (select count(*) from public.question_options) as options,
  (select count(*) from public.learning_rules) as rules,
  (select count(*) from public.rule_questions) as rule_links;
```

Question data is publicly readable; progress rows are protected by RLS and scoped to the signed-in user. The browser uses only a publishable key. Never put `sb_secret` or `service_role` in this project.

## Supabase auth and Vercel

`js/supabase-config.js` contains the project URL and publishable key. After deploying, set the Vercel domain as the Supabase Auth Site URL and add it to Allowed Redirect URLs. Register with email/password, confirm the email if required, then use the same account on every device.

In Vercel, import the repository using the Other framework preset, with no build command and the project root as the output directory. Static files in the root and `js/` are served directly.
