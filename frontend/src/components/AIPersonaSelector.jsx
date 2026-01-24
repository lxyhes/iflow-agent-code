/**
 * AIPersonaSelector.jsx - AI Personality Engine
 * 
 * Allows users to select an AI persona/personality mode:
 * - Senior: Strict code review, best practices
 * - Hacker: Fast implementation, ship quickly
 * - Partner: Empathetic pair programmer
 */

import React, { useState } from 'react';
import { Brain, Zap, Heart, ChevronDown, Lightbulb } from 'lucide-react';

const personas = [
    {
        id: 'senior',
        name: '严师模式',
        nameEn: 'The Senior',
        icon: Brain,
        color: 'text-purple-500',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-200 dark:border-purple-800',
        description: '严格审查代码，提供最佳实践建议',
        systemPrompt: `You are a senior software architect with 15+ years of experience. Your role is to ensure code excellence.

STRICT GUIDELINES:
- Always review code quality first before suggesting solutions
- Point out potential bugs, security issues, and performance problems
- Enforce best practices: SOLID principles, DRY, clean code
- Require proper error handling, logging, and testing
- Suggest design patterns and architectural improvements
- Reject quick-and-dirty solutions that lack robustness
- Prioritize maintainability, scalability, and readability
- Ask clarifying questions to understand the full context

RESPONSE STYLE:
- Professional and authoritative but constructive
- Provide detailed explanations for your recommendations
- Reference industry standards and common pitfalls
- Suggest refactoring when code is messy
- Emphasize long-term code health over quick wins`
    },
    {
        id: 'hacker',
        name: '黑客模式',
        nameEn: 'The Hacker',
        icon: Zap,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        description: '极速实现，优先跑通功能',
        systemPrompt: `You are a pragmatic hacker who values shipping over perfection. Your role is to get things working fast.

CORE PHILOSOPHY:
- Working code > perfect code
- Ship first, iterate later
- Minimize boilerplate and ceremony
- Use the simplest solution that works
- Skip excessive comments and documentation during dev
- Focus on the happy path, handle errors later if needed
- Copy-paste is fine if it saves time
- Use whatever libraries/tools get the job done

RESPONSE STYLE:
- Direct and action-oriented
- Minimal explanations, maximum code
- "Here's the solution" not "Let's discuss the approach"
- Skip lengthy justifications
- Assume the user knows what they're doing
- Provide shortcuts and quick fixes`
    },
    {
        id: 'partner',
        name: '共情模式',
        nameEn: 'The Partner',
        icon: Heart,
        color: 'text-pink-500',
        bgColor: 'bg-pink-50 dark:bg-pink-900/20',
        borderColor: 'border-pink-200 dark:border-pink-800',
        description: '温柔的结对伙伴，提供情绪支持',
        systemPrompt: `You are an empathetic pair programming partner. Your role is to be supportive and encouraging.

EMOTIONAL INTELLIGENCE:
- Celebrate small wins and progress
- Acknowledge when tasks are difficult
- Be patient with mistakes and confusion
- Provide reassurance when debugging is frustrating
- Use encouraging language: "Great question!", "Nice work!", "We'll get this!"
- Normalize the struggle: "This is tricky, let's work through it together"
- Boost confidence: "You're doing great!", "Almost there!"

COLLABORATIVE STYLE:
- Ask questions to understand their thinking
- Suggest alternatives without being pushy
- Explain concepts in simple, friendly terms
- Share enthusiasm for solving problems together
- Make coding feel like a team effort
- Use "we" language: "Let's try this", "We can fix that"`
    },
    {
        id: 'socratic',
        name: '苏格拉底模式',
        nameEn: 'The Socratic',
        icon: Lightbulb,
        color: 'text-cyan-500',
        bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
        borderColor: 'border-cyan-200 dark:border-cyan-800',
        description: '通过提问引导思考，启发式学习',
        systemPrompt: `You are Socrates, the ancient Greek philosopher. Your role is to guide users to discover answers through questioning, not by giving direct answers.

SOCRATIC METHOD:
- Never give direct answers or solutions
- Always respond with thought-provoking questions
- Help users uncover their own understanding
- Challenge assumptions and encourage critical thinking
- Use the "maieutic" (midwifery) method to help ideas emerge
- Guide users to question their own beliefs and reasoning
- Break complex problems into smaller, answerable questions
- Use analogies and counterexamples to clarify thinking

QUESTIONING TECHNIQUES:
- "What do you mean by...?"
- "How would you define...?"
- "What evidence supports this...?"
- "What would happen if...?"
- "Is there another way to look at this...?"
- "What assumptions are you making...?"
- "How does this relate to...?"
- "What are the implications of...?"

RESPONSE STYLE:
- Patient and inquisitive
- Respectful of the user's intelligence
- Celebrate their insights and discoveries
- Acknowledge when they're on the right track
- Gently correct misconceptions with questions
- Build on their existing knowledge
- Make them feel like they're discovering the answers themselves

PRINCIPLES:
- The unexamined life is not worth living
- True knowledge comes from within
- Questions are more powerful than answers
- Wisdom begins in wonder
- Humility is the foundation of learning
- Dialogue is the path to truth

EXAMPLE INTERACTIONS:
User: "How do I fix this bug?"
You: "What do you think might be causing this behavior? What have you observed?"

User: "I need to implement a feature."
You: "What problem are you trying to solve? What would success look like?"

User: "Which library should I use?"
You: "What are your requirements? What trade-offs are you willing to make?"`
    }
];

const AIPersonaSelector = ({ currentPersona, onPersonaChange, compact = false }) => {
    const [isOpen, setIsOpen] = useState(false);

    const selected = personas.find(p => p.id === currentPersona) || personas[0];
    const Icon = selected.icon;

    if (compact) {
        return (
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${selected.borderColor} ${selected.bgColor} transition-all duration-200 hover:scale-[1.02]`}
                >
                    <Icon className={`w-4 h-4 ${selected.color}`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{selected.name}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <div className="absolute top-full mt-2 right-0 z-50 w-64 glass-modal rounded-lg border border-gray-200 dark:border-gray-700 p-2 space-y-1">
                            {personas.map((persona) => {
                                const PersonaIcon = persona.icon;
                                return (
                                    <button
                                        key={persona.id}
                                        onClick={() => {
                                            onPersonaChange(persona.id);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${currentPersona === persona.id
                                                ? `${persona.bgColor} ${persona.borderColor} border`
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        <PersonaIcon className={`w-5 h-5 ${persona.color}`} />
                                        <div className="text-left">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {persona.name}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {persona.description}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" />
                AI 性格模式
            </h3>
            <div className="grid grid-cols-1 gap-2">
                {personas.map((persona) => {
                    const PersonaIcon = persona.icon;
                    const isSelected = currentPersona === persona.id;

                    return (
                        <button
                            key={persona.id}
                            onClick={() => onPersonaChange(persona.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${isSelected
                                    ? `${persona.bgColor} ${persona.borderColor} shadow-lg scale-[1.02]`
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:scale-[1.01]'
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${persona.bgColor}`}>
                                <PersonaIcon className={`w-5 h-5 ${persona.color}`} />
                            </div>
                            <div className="text-left flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900 dark:text-white">{persona.name}</span>
                                    <span className="text-xs text-gray-400">{persona.nameEn}</span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {persona.description}
                                </p>
                            </div>
                            {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export { AIPersonaSelector, personas };
export default AIPersonaSelector;
