# 30 Seconds

A 30 Seconds game for Datalab students, to see which terms they find hard to explain or guess.

**Play it:** https://datalabhva.github.io/30_seconds/

## How it works

- Tick one or more word lists in the sidebar, or upload your own `.txt` file (one term per line).
- Press **Next** (or the space bar) to get 5 random words and start the timer.
- When the time runs out, a sound plays and the card turns pink.
- Words don't repeat until every word in the chosen lists has been played.
- Click a word to mark it as guessed. Press **F** for full screen.
- Change the round length with the slider (10–60 s). The browser remembers your settings and uploaded lists.

## Adding a word list

1. Add a `.txt` file to `categories/` with one term per line.
2. Add a line for it to `categories/index.json`:
   ```json
   { "name": "My new list", "file": "my_new_list.txt" }
   ```

## Hosting on GitHub Pages

The site is plain HTML/CSS/JS (`index.html`, `style.css`, `app.js`), so there is no build step.
In the repository go to **Settings → Pages**, set *Source* to **Deploy from a branch**, choose `main` and `/ (root)`, and save.

To run it locally, serve the folder with any static web server (opening `index.html` directly won't load the word lists):

```bash
python -m http.server 8000
```

The original Streamlit version is still in `app.py`.
