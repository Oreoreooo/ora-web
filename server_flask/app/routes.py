from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.blueprints.services_chat import AIService
from app.blueprints.services_asr import ASRService
# from app.blueprints.openai import AIService
from app.extension import db
from app.models import UserModel, Conversation, ChatMessage
from io import BytesIO
import requests
from app.config import Config

bp = Blueprint('main', __name__)
ai_service = AIService()
asr_service = ASRService()

# Protected routes
@bp.route('/conversations', methods=['POST'])
@jwt_required()
def create_conversation():
    """
    Create a new conversation
    """
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        conversation = Conversation(
            user_id=current_user_id,
            title=data['title'],
            content=data['content'],
            date=data['date']
        )
        
        db.session.add(conversation)
        db.session.commit()
        
        # Add initial messages if provided
        if 'messages' in data:
            for msg in data['messages']:
                message = ChatMessage(
                    conversation_id=conversation.id,
                    role=msg['role'],
                    content=msg['content']
                )
                db.session.add(message)
            db.session.commit()
        
        return jsonify(conversation.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Server error'}), 500

@bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    """
    Get all conversations for current user
    """
    current_user_id = get_jwt_identity()
    conversations = Conversation.query.filter_by(user_id=current_user_id).order_by(Conversation.created_at.desc()).all()
    return jsonify([conv.to_dict() for conv in conversations])

@bp.route('/conversations/<int:conversation_id>', methods=['GET'])
@jwt_required()
def get_conversation(conversation_id):
    """
    Get a specific conversation
    """
    current_user_id = get_jwt_identity()
    conversation = Conversation.query.filter_by(id=conversation_id, user_id=current_user_id).first_or_404()
    return jsonify(conversation.to_dict())

@bp.route('/conversations/<int:conversation_id>', methods=['PUT'])
@jwt_required()
def update_conversation(conversation_id):
    """
    Update a conversation
    """
    current_user_id = get_jwt_identity()
    conversation = Conversation.query.filter_by(id=conversation_id, user_id=current_user_id).first_or_404()
    
    data = request.get_json()
    
    try:
        if 'title' in data:
            conversation.title = data['title']
        if 'content' in data:
            conversation.content = data['content']
        if 'date' in data:
            conversation.date = data['date']
        
        db.session.commit()
        return jsonify(conversation.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Server error'}), 500

@bp.route('/conversations/<int:conversation_id>', methods=['DELETE'])
@jwt_required()
def delete_conversation(conversation_id):
    """
    Delete a conversation
    """
    current_user_id = get_jwt_identity()
    conversation = Conversation.query.filter_by(id=conversation_id, user_id=current_user_id).first_or_404()
    
    try:
        db.session.delete(conversation)
        db.session.commit()
        return jsonify({'message': 'Conversation deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Server error'}), 500

@bp.route('/chat', methods=['POST'])
@jwt_required()
def chat():
    """
    Chat with AI
    """
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        response = ai_service.chat(data['messages'])
        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/transcribe', methods=['POST'])
@jwt_required()
def transcribe():
    """
    Transcribe audio to text
    """
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    try:
        # Convert the audio file to a format that ASRService can process
        audio_data = audio_file.read()
        audio_buffer = BytesIO(audio_data)
        
        # Use the ASR model to transcribe
        res = asr_service.model.generate(
            input=audio_buffer,
            cache={},
            language="auto",
            use_itn=True,
            batch_size_s=60,
            merge_vad=True,
            merge_length_s=15,
        )
        
        # Process result
        from funasr.utils.postprocess_utils import rich_transcription_postprocess
        text = rich_transcription_postprocess(res[0]["text"])
        return jsonify({'text': text.strip()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/asr/start', methods=['POST'])
@jwt_required()
def start_asr():
    """
    Start ASR recording
    """
    try:
        result = asr_service.start_recording()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/asr/stop', methods=['POST'])
@jwt_required()
def stop_asr():
    """
    Stop ASR recording
    """
    try:
        result = asr_service.stop_recording()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/regenerate-text', methods=['POST'])
@jwt_required()
def regenerate_text():
    """
    Regenerate text using AI
    """
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400

        current_content = data.get('currentContent', '')
        new_content = data['text']
        
        regenerated_text = ai_service.regenerate_text(current_content, new_content)
        return jsonify({'regenerated_text': regenerated_text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

