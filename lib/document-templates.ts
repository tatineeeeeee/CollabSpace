export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  content: string;
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "meeting-notes",
    title: "Meeting Notes",
    description: "Agenda, attendees, and action items",
    icon: "\uD83D\uDCDD",
    content: JSON.stringify({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Meeting Notes" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Attendees" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Name 1" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Name 2" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Agenda" }] },
        { type: "orderedList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Topic 1" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Topic 2" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Notes" }] },
        { type: "paragraph" },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Action Items" }] },
        { type: "taskList", content: [
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Action item 1" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Action item 2" }] }] },
        ]},
      ],
    }),
  },
  {
    id: "project-brief",
    title: "Project Brief",
    description: "Overview, goals, timeline, stakeholders",
    icon: "\uD83D\uDCCB",
    content: JSON.stringify({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Project Brief" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Overview" }] },
        { type: "paragraph", content: [{ type: "text", text: "Describe the project purpose and scope." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Goals" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Goal 1" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Goal 2" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Timeline" }] },
        { type: "paragraph", content: [{ type: "text", text: "Add key milestones and deadlines." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Stakeholders" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Stakeholder 1 - Role" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Stakeholder 2 - Role" }] }] },
        ]},
      ],
    }),
  },
  {
    id: "weekly-plan",
    title: "Weekly Plan",
    description: "Goals, tasks, and reflections for the week",
    icon: "\uD83D\uDCC5",
    content: JSON.stringify({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Weekly Plan" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "This Week's Goals" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Goal 1" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Goal 2" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Tasks" }] },
        { type: "taskList", content: [
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Task 1" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Task 2" }] }] },
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Task 3" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Reflections" }] },
        { type: "paragraph", content: [{ type: "text", text: "What went well? What can be improved?" }] },
      ],
    }),
  },
  {
    id: "brainstorm",
    title: "Brainstorm",
    description: "Free-form ideation space",
    icon: "\uD83D\uDCA1",
    content: JSON.stringify({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Brainstorm" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Ideas" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Idea 1" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Idea 2" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Idea 3" }] }] },
        ]},
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Pros & Cons" }] },
        { type: "paragraph" },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Next Steps" }] },
        { type: "taskList", content: [
          { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Follow up on..." }] }] },
        ]},
      ],
    }),
  },
  {
    id: "decision-log",
    title: "Decision Log",
    description: "Track decisions, context, and outcomes",
    icon: "\u2696\uFE0F",
    content: JSON.stringify({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Decision Log" }] },
        { type: "table", content: [
          { type: "tableRow", content: [
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Decision" }] }] },
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Context" }] }] },
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Outcome" }] }] },
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Date" }] }] },
          ]},
          { type: "tableRow", content: [
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Decision 1" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Why this was decided" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Result" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "YYYY-MM-DD" }] }] },
          ]},
        ]},
      ],
    }),
  },
];
