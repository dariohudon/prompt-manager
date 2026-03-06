// Prompt Manager - Background Service Worker
// Minimal - handles install event and icon badge

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    // Seed sample data on first install
    const sample = [
      {
        id: crypto.randomUUID(),
        name: 'Sample Client',
        prompts: [
          {
            id: crypto.randomUUID(),
            title: 'Professional Email',
            text: 'Write a professional email to [recipient] about [topic]. Keep it concise, friendly, and end with a clear call to action.'
          },
          {
            id: crypto.randomUUID(),
            title: 'Meeting Summary',
            text: 'Summarize the following meeting notes into bullet points, highlighting key decisions, action items, and owners:\n\n[paste meeting notes here]'
          }
        ]
      }
    ];

    chrome.storage.local.set({ clients: sample });
  }
});
