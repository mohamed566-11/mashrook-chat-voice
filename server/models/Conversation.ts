import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
  role: 'user' | 'model';
  text: string;
  createdAt: Date;
}

export interface IConversation extends Document {
  conversationId: string;
  userId?: string; // Add this
  messages: IMessage[];
  updatedAt: Date;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  role: { type: String, enum: ['user', 'model'], required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ConversationSchema = new Schema<IConversation>(
  {
    conversationId: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    messages: [MessageSchema],
  },
  { timestamps: true }
);

ConversationSchema.index({ conversationId: 1, userId: 1 }, { unique: true });

export default mongoose.model<IConversation>('Conversation', ConversationSchema);
