'use client';

import { PromptCopyButton } from '@/components/PromptCopyButton';
import { Modal } from '@/components/ui/Modal';

function Code({ children }: { children: React.ReactNode }) {
  return <code className="px-1.5 py-0.5 bg-surface-2 rounded text-sm font-mono">{children}</code>;
}

interface ProblemCreationGuideModalProps {
  open: boolean;
  onClose: () => void;
  role: 'admin' | 'manager';
}

export function ProblemCreationGuideModal({ open, onClose, role }: ProblemCreationGuideModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Problem Creation Guide"
      description="How to create a problem with the LLM-assisted workflow."
      className="max-w-2xl"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-md bg-surface-2 hover:bg-surface-3 text-sm font-medium text-foreground"
        >
          Close
        </button>
      }
    >
      <div className="space-y-4 text-sm">
        <p className="text-text-muted">Fill in the fields on this page: name, description (Markdown), points, and time/memory limits. Then upload a C++ generator and click <Code>Create Problem</Code>.</p>
        <p className="text-text-muted">The fastest path is our two LLM prompts: one converts a problem PDF into the <Code>.md</Code> this site expects, the other writes its <Code>generator.cpp</Code>. Paste either into a fresh chat with any LLM (Claude, ChatGPT, Gemini, etc.) and follow its instructions. You can also write both by hand.</p>

        <div className="flex flex-wrap gap-2">
          <PromptCopyButton label="Copy Conversion Prompt" url="/conversion.md" />
          <PromptCopyButton label="Copy Generator Prompt" url="/generator.md" />
        </div>

        <div className="space-y-2">
          <p className="text-text-muted"><strong className="text-foreground">Workflow:</strong></p>
          <ol className="list-decimal list-inside ml-4 space-y-1.5 text-text-muted">
            <li>Download a problem PDF (we recommend <a href="https://dmoj.ca" target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">dmoj.ca</a>).</li>
            <li>In a fresh LLM chat, paste the <strong className="text-foreground">conversion prompt</strong> before uploading anything. It will ask for PDFs one at a time and convert each into a problem <Code>.md</Code> in the required format (time/memory limits at top, description, I/O specs, samples).</li>
            <li>Paste the <Code>.md</Code> into the problem-description field.</li>
            <li>In a new chat, paste the <strong className="text-foreground">generator prompt</strong> and give it your problem <Code>.md</Code>. It produces a <Code>generator.cpp</Code> that emits inputs on <Code>stdout</Code> and outputs on <Code>stderr</Code> as JSON arrays, respecting sub-task constraints (each mark = one test case).</li>
            <li>Upload the <Code>generator.cpp</Code> and click <Code>Generate Test Cases</Code>.</li>
            {role === 'admin' ? (
              <li>Save the problem. It stays pending until a manager approves it.</li>
            ) : (
              <li>Click <Code>Create Problem</Code> to save.</li>
            )}
          </ol>
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">Markdown formatting quirks</h3>
          <ul className="list-disc list-inside ml-4 space-y-1.5 text-text-muted">
            <li>The generated <Code>.md</Code> starts with the problem title as a <Code>#</Code> heading. Delete that line and enter the title in the <strong className="text-foreground">Problem Name</strong> field instead; otherwise the title appears twice.</li>
            <li>The generated <Code>.md</Code> also lists the <strong className="text-foreground">time and memory limits</strong> at the very top, for your reference only. Delete them from the <Code>.md</Code> and enter them in the <strong className="text-foreground">Time Limit (ms)</strong> and <strong className="text-foreground">Memory Limit (MB)</strong> fields instead.</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
