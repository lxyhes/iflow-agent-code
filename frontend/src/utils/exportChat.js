/**
 * Export chat conversation to various formats
 */

export const exportToMarkdown = (messages, projectName, sessionId) => {
  if (!messages || messages.length === 0) {
    alert('No messages to export');
    return;
  }

  let markdown = `# Chat Export\n\n`;
  markdown += `**Project:** ${projectName || 'Unknown'}\n`;
  markdown += `**Session ID:** ${sessionId || 'Unknown'}\n`;
  markdown += `**Date:** ${new Date().toLocaleString()}\n`;
  markdown += `**Total Messages:** ${messages.length}\n\n`;
  markdown += `---\n\n`;

  messages.forEach((msg, index) => {
    const role = msg.type === 'user' ? '👤 User' : msg.type === 'assistant' ? '🤖 Assistant' : '📝 System';
    const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'Unknown';

    markdown += `## ${role}\n`;
    markdown += `*${timestamp}*\n\n`;

    if (msg.images && msg.images.length > 0) {
      markdown += `**Images:** ${msg.images.length}\n\n`;
    }

    markdown += `${msg.content || ''}\n\n`;

    if (msg.isToolUse) {
      markdown += `**Tool:** ${msg.toolName}\n`;
      markdown += `**Status:** ${msg.toolStatus}\n\n`;
    }

    if (index < messages.length - 1) {
      markdown += `---\n\n`;
    }
  });

  downloadFile(markdown, `chat-export-${sessionId || 'unknown'}.md`, 'text/markdown');
};

export const exportToJSON = (messages, projectName, sessionId) => {
  if (!messages || messages.length === 0) {
    alert('No messages to export');
    return;
  }

  const data = {
    metadata: {
      project: projectName || 'Unknown',
      sessionId: sessionId || 'Unknown',
      exportedAt: new Date().toISOString(),
      messageCount: messages.length
    },
    messages: messages.map(msg => ({
      id: msg.id,
      type: msg.type,
      content: msg.content,
      timestamp: msg.timestamp,
      images: msg.images,
      isToolUse: msg.isToolUse,
      toolName: msg.toolName,
      toolStatus: msg.toolStatus
    }))
  };

  downloadFile(JSON.stringify(data, null, 2), `chat-export-${sessionId || 'unknown'}.json`, 'application/json');
};

export const exportToText = (messages, projectName, sessionId) => {
  if (!messages || messages.length === 0) {
    alert('No messages to export');
    return;
  }

  let text = `Chat Export\n`;
  text += `Project: ${projectName || 'Unknown'}\n`;
  text += `Session ID: ${sessionId || 'Unknown'}\n`;
  text += `Date: ${new Date().toLocaleString()}\n`;
  text += `Total Messages: ${messages.length}\n`;
  text += `${'='.repeat(50)}\n\n`;

  messages.forEach((msg, index) => {
    const role = msg.type === 'user' ? '[User]' : msg.type === 'assistant' ? '[Assistant]' : '[System]';
    const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'Unknown';

    text += `${role} ${timestamp}\n`;
    text += `${'-'.repeat(30)}\n`;
    text += `${msg.content || ''}\n\n`;

    if (index < messages.length - 1) {
      text += `${'='.repeat(50)}\n\n`;
    }
  });

  downloadFile(text, `chat-export-${sessionId || 'unknown'}.txt`, 'text/plain');
};

const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};