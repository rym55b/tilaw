-- Create session_feedback table for storing feedback from both students
CREATE TABLE session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  feedback_giver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feedback_type TEXT CHECK (feedback_type IN ('correction', 'reading')) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_session_feedback_session_id ON session_feedback(session_id);
CREATE INDEX idx_session_feedback_giver_id ON session_feedback(feedback_giver_id);
CREATE INDEX idx_session_feedback_type ON session_feedback(feedback_type);

-- Add comment to document the table
COMMENT ON TABLE session_feedback IS 'Stores feedback/corrections from students during recitation sessions';
COMMENT ON COLUMN session_feedback.feedback_type IS 'Indicates the role of the person giving feedback: "correction" = was correcting, "reading" = was reading';
