import sys
import os

# Add the current directory to sys.path to ensure imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.impl.reviewer import create_code_review_agent

def main():
    print("Initializing Code Review Agent...")
    # TODO: Replace with actual API KEY or Environment Variable
    agent = create_code_review_agent(api_key="sk-mock-key")
    
    print(f"Agent {agent.name} is ready.")
    print("Type 'exit' to quit.")
    print("-" * 50)
    
    while True:
        try:
            user_input = input("\nYou: ")
            if user_input.lower() in ["exit", "quit"]:
                break
            
            if not user_input.strip():
                continue
                
            response = agent.chat(user_input)
            print(f"\nAgent: {response}")
            
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    main()
