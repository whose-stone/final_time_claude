# Final Time

A retro 2D scroller Bible-trivia adventure built for **Arizona Christian
University** Firebirds. Students sign in with email/password, pick an
anamorphic Firebird (boy or girl), and fight through five themed levels —
**Beach, Desert, Forest, Arctic, Castle** — defeating gargoyles that throw
"temptations" (beer cans, game controllers) by collecting floating Bibles
that hand out Bible-trivia power-ups. Correct trivia grants three golden
"prayer" shots that make gargoyles explode into stone shards and float an
**AMEN!** popup. Each level also has pen-and-paper pickups that open the
teacher-configured level questions, which drive the player's score and
letter grade (A/B/C/D/F). The Castle level ends with a boss fight against a
chubby bearded teacher who throws homework paper airplanes; three prayers
defeat him and he sits down with a Diet Mountain Dew.

Stack: **Next.js 14 + TypeScript + Firebase** (Auth + Realtime Database).

## Game features

- Email/password auth via Firebase
- Character picker (anamorphic Firebird boy / girl) in ACU crimson & gold
- Retro 2D canvas scroller with parallax backgrounds
- Gargoyle enemies that patrol and throw temptations (cans / controllers)
- Castle boss fight: jumps, throws paper-airplane homework, needs 3 prayer
  hits to defeat. When defeated he sits with a Diet Mtn Dew.
- Floating Bible power-ups → Bible trivia question → 3 prayers if correct
- Pen+paper pickups → level questions worth points
- Prayers shoot as golden praying hands and explode gargoyles with AMEN!
- Parallax background scrolls at 0.3× / 0.6× for depth
- HUD: letter grade, prayers, level, next question, lives, score
- Per-level results screen (grade, score, accuracy, gargoyles, time)
- Checkpoint saved at the last answered question
- Lives configurable (limited or infinite) by admin

## Admin panel (`/admin`)

Any user signed in with an email in `NEXT_PUBLIC_ADMIN_EMAILS` (or with
`isAdmin: true` on their player node) is redirected to `/admin`.

- **Players** tab — view all players, click a score to edit, download a
  PDF summary, or reset the player's game state
- **Questions** tab — add / edit / delete questions per level; multiple
  choice or text response; configurable points
- **Game Config** tab — toggle limited lives, set starting lives, and
  configure per-level Bible-trivia count, gargoyle count, question count,
  and points per question

## Local setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in the Firebase keys
   from the console. The project is pre-wired to
   `https://claude-acu-game-default-rtdb.firebaseio.com`.
3. In Firebase Console, enable **Email/Password** auth and **Realtime
   Database**. Open rules to authenticated users or something like:
   ```json
   {
     "rules": {
       "players": {
         "$uid": {
           ".read": "auth != null",
           ".write": "auth != null && (auth.uid == $uid || root.child('players/' + auth.uid + '/isAdmin').val() == true)"
         }
       },
       "questions": { ".read": "auth != null", ".write": "auth != null && root.child('players/' + auth.uid + '/isAdmin').val() == true" },
       "config":    { ".read": "auth != null", ".write": "auth != null && root.child('players/' + auth.uid + '/isAdmin').val() == true" }
     }
   }
   ```
4. `npm run dev` and open http://localhost:3000

## Data layout (RTDB)

```
/config/game                 -> GameConfig (lives, per-level settings)
/questions/<id>              -> Question
/players/<uid>               -> PlayerState (character, score, checkpoint, levelResults[])
```

## Controls

- **← →** or **A / D** — move
- **Space** / **↑** / **W** — jump (gargoyles cannot jump; the boss can)
- **F** or **Shift** — shoot a prayer (when you have any)

Go Firebirds!
