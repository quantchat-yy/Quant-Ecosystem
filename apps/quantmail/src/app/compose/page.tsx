'use client';

import { FormField, TextArea, Button, Input } from '@quant/shared-ui';

export default function ComposePage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between p-4 border-b border-[var(--quant-border)]">
        <h1 className="text-lg font-semibold">New Message</h1>
        <div className="flex gap-2">
          <Button variant="secondary">Save Draft</Button>
          <Button variant="primary">Send</Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <FormField label="To" required>
          <Input placeholder="recipient@example.com" />
        </FormField>
        <FormField label="CC">
          <Input placeholder="cc@example.com" />
        </FormField>
        <FormField label="Subject" required>
          <Input placeholder="Email subject" />
        </FormField>
        <FormField label="Message" required>
          <TextArea placeholder="Write your message here..." rows={12} resize="vertical" />
        </FormField>
      </div>
    </div>
  );
}
