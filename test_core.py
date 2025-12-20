import sys
import os

# Ensure backend can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.impl.reviewer import create_code_review_agent

def test_agent_loop():
    print(">>> Initializing Agent...")
    agent = create_code_review_agent(api_key="sk-test")
    
    prompt = "Please review the code in this directory."
    print(f">>> User Prompt: {prompt}")
    
    response = agent.chat(prompt)
    
    print("\n>>> Final Response from Agent:")
    print(response)
    
    # Verify history to see if tool was called
    print("\n>>> Inspection of History:")
    for msg in agent.history:
        print(f"[{msg.role.value.upper()}] {msg.content[:50]}..." + (" [Tool Call]" if msg.tool_calls else ""))
        if msg.role == "tool":
            print(f"   -> Tool Output: {msg.content[:100]}...")

if __name__ == "__main__":
    test_agent_loop()
