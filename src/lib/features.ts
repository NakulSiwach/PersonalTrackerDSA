/**
 * Everything the app can do, in plain words. Shown in the "Explore features" popup.
 *
 * ➜ WHEN YOU ADD A FEATURE, ADD IT HERE TOO. The e2e test "Explore features lists every
 *   feature" checks that each entry below appears in the popup.
 */
export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export interface FeatureGroup {
  name: string;
  features: Feature[];
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    name: "Organise",
    features: [
      { icon: "📁", title: "Folders", description: "Make a folder per topic (Arrays, Graphs, DP…). Rename or delete it from its ⋯ menu." },
      { icon: "📌", title: "Pin folders", description: "Pin your favourite folders from their ⋯ menu so they stay at the top of the home screen." },
      { icon: "📝", title: "Questions", description: "Each question has a title, problem link, difficulty (Easy / Medium / Hard) and tags." },
      { icon: "➕", title: "Quick add", description: "Press the round + button (bottom right) or the N key to add a question from any page and pick its folder." },
      { icon: "🔎", title: "Search and tag filter", description: "In a folder, search questions by title or show only one tag." },
      { icon: "↕️", title: "Sort by difficulty", description: "The Difficulty button next to search sorts Hard → Easy, then Easy → Hard, then back to normal." },
    ],
  },
  {
    name: "Revise",
    features: [
      { icon: "🔁", title: "Revise next card", description: "The first card in every folder shows the question you revised longest ago." },
      { icon: "✅", title: "Mark as revised", description: "Sets the question's last-revised date to today. The Revise next card then moves to the next oldest question." },
      { icon: "➡️", title: "Next suggestion", description: "Open a question from the Revise next card, mark it revised, then use Next suggestion → to keep going." },
      { icon: "★", title: "Famous Patterns", description: "Turn on Pattern on any question to also list it in the Famous Patterns folder, with its own Revise next card." },
      { icon: "🔥", title: "Streak", description: "Counts days in a row where you added or revised at least one question. Click it for your best streak and last 14 days." },
      { icon: "📊", title: "Solved dashboard", description: "Home shows how many Easy, Medium and Hard questions you have; each folder shows its own counts." },
    ],
  },
  {
    name: "Write notes",
    features: [
      { icon: "✍️", title: "Rich notes", description: "Bold, italic, headings, lists, code blocks, links and 4 highlight colours. Everything saves automatically." },
      { icon: "🖼️", title: "Images and screenshots", description: "Upload, drag in, or paste a screenshot with Ctrl+V. Big screenshots are shrunk automatically." },
      { icon: "∑", title: "Math formulas", description: "Type $O(n log n)$ or $$T(n) = 2T(n/2) + n$$ (or use the ∑ button) to show formulas nicely. Click one to edit it." },
      { icon: "⬇️", title: "Download a folder", description: "In a folder, Download saves all its notes as a PDF (via Save as PDF) or a single HTML file with images." },
    ],
  },
  {
    name: "Everything else",
    features: [
      { icon: "🌙", title: "Dark mode", description: "Switch between light and dark with the moon / sun button. Your choice is remembered." },
      { icon: "🔗", title: "Study links", description: "Top bar shortcuts to Striver A2Z sheet, NeetCode 250, the Pomodoro timer and TaskFlow (on phones: the grid button)." },
      { icon: "🔒", title: "Private account", description: "Your folders, questions and images are only visible to you." },
    ],
  },
];
