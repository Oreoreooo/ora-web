import requests
from app.extension import db
from app.models import Conversation, ChatMessage
from ..config import Config

class AIService:
    @staticmethod
    def regenerate_text(current_content, new_content):
        try:
            prompt = ''
            if not current_content:
                prompt = f'Please help improve the fluency of this text: "{new_content}". Return ONLY the improved text without any additional commentary or explanations.'
            else:
                prompt = f'Please combine and improve the fluency of these two texts. You can make some adjustment to make it more fluent. First text: "{current_content}". Second text: "{new_content}". Return ONLY the improved text without any additional commentary or explanations.'

            response = requests.post(
                'https://open.bigmodel.cn/api/paas/v4/chat/completions',
                json={
                    'model': 'glm-4-plus',
                    'messages': [
                        {
                            'role': 'system',
                            'content': "You are an assistant who helps improve text fluency.No other additional information should be added.Return ONLY the improved text without any additional commentary, explanations, or formatting."
                        },
                        {
                            'role': 'user',
                            'content': prompt
                        }
                    ]
                },
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {Config.TEXT_REGENERATION_API_KEY}'
                }
            )
            response_data = response.json()
            
            if not response.ok:
                raise Exception(f"API Error: {response_data.get('error', 'Unknown error')}")
            
            if 'choices' not in response_data or not response_data['choices']:
                raise Exception("No response from AI model")
                
            return response_data['choices'][0]['message']['content'].strip()
        except Exception as e:
            raise Exception(f"Failed to regenerate text: {str(e)}")

    @staticmethod
    def chat(messages):
        try:
            if not any(msg.get('role') == 'system' for msg in messages):
                messages.insert(0, {
                    'role': 'system',
                    'content': "You are an assistant who helps the older adults write digital journals. \
                              You should ask questions based on the information provided by the older adults to help them recall and talk about their experience and ideas. \
                              Please note: First, please only ask one question at a time. \
                              Second, the questions need to be short and uncomplicated. \
                              Third, use a gentle tone to encourage the older adults to recall and think."
                })

            response = requests.post(
                'https://open.bigmodel.cn/api/paas/v4/chat/completions',
                json={
                    'model': 'glm-4-plus',
                    'messages': messages
                },
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {Config.CHAT_API_KEY}'
                }
            )
            response_data = response.json()
            
            if not response.ok:
                raise Exception(f"API Error: {response_data.get('error', 'Unknown error')}")
            
            if 'choices' not in response_data or not response_data['choices']:
                raise Exception("No response from AI model")
                
            return response_data
        except Exception as e:
            raise Exception(f"Failed to process chat: {str(e)}")

class ConversationService:
    @staticmethod
    def create_conversation(title, content, date, messages=None):
        try:
            conversation = Conversation(title=title, content=content, date=date)
            db.session.add(conversation)
            db.session.commit()

            if messages:
                for message in messages:
                    chat_message = ChatMessage(
                        conversation_id=conversation.id,
                        role=message['role'],
                        content=message['content']
                    )
                    db.session.add(chat_message)
                db.session.commit()

            return conversation
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to create conversation: {str(e)}")

    @staticmethod
    def get_all_conversations():
        try:
            return Conversation.query.all()
        except Exception as e:
            raise Exception(f"Failed to fetch conversations: {str(e)}")

    @staticmethod
    def get_conversation(conversation_id):
        try:
            return Conversation.query.get(conversation_id)
        except Exception as e:
            raise Exception(f"Failed to fetch conversation: {str(e)}")

    @staticmethod
    def save_messages(conversation_id, messages):
        try:
            for message in messages:
                # Only save user messages
                if message['role'] == 'user':
                    chat_message = ChatMessage(
                        conversation_id=conversation_id,
                        role=message['role'],
                        content=message['content']
                    )
                    db.session.add(chat_message)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to save messages: {str(e)}") 