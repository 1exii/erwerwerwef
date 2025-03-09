import React, { useState, useRef } from 'react';
import { Box, Button, Container, TextField, Typography, Paper, CircularProgress, Grid } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';

interface AnalysisResult {
  total_words: number;
  filler_words: number;
  filler_ratio: number;
}

interface ScoreResult {
  score: number;
  matched_keywords: string[];
}

interface ProcessedResult {
  success: boolean;
  transcription: string;
  analysis: AnalysisResult;
  score: ScoreResult | null;
  feedback: string[];
}

const InterviewCoach: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.addEventListener('dataavailable', (event) => {
        chunksRef.current.push(event.data);
      });

      mediaRecorderRef.current.addEventListener('stop', () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        sendAudioToServer(audioBlob);
      });

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Stop recording after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 30000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Error accessing microphone. Please ensure you have granted microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const sendAudioToServer = async (audioBlob: Blob) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('job_description', jobDescription);

    try {
      const response = await fetch('http://localhost:5000/api/process_audio', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Error sending audio to server:', err);
      alert('Error processing audio. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        AI Interview Coach 🎯
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Job Description (Optional)
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description here to get more relevant feedback..."
          variant="outlined"
        />
      </Paper>

      <Paper elevation={3} sx={{ p: 3, mb: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Practice Interview
        </Typography>
        <Button
          variant="contained"
          color={isRecording ? "error" : "primary"}
          startIcon={isRecording ? <StopIcon /> : <MicIcon />}
          onClick={isRecording ? stopRecording : startRecording}
          size="large"
          sx={{ my: 2 }}
        >
          {isRecording ? "Stop Recording" : "Start Recording (30s)"}
        </Button>
      </Paper>

      {loading && (
        <Box sx={{ textAlign: 'center', my: 4 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Processing your response...</Typography>
        </Box>
      )}

      {result && (
        <>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Your Answer
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {result.transcription}
            </Typography>
          </Paper>

          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Speech Analysis
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle1">Total Words</Typography>
                  <Typography variant="h4">{result.analysis.total_words}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle1">Filler Words</Typography>
                  <Typography variant="h4">{result.analysis.filler_words}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle1">Filler Word Ratio</Typography>
                  <Typography variant="h4">
                    {(result.analysis.filler_ratio * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {result.score && (
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Job Relevance Analysis
              </Typography>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="h4">{result.score.score.toFixed(1)}%</Typography>
                <Typography variant="subtitle1">Relevance Score</Typography>
              </Box>
              {result.score.matched_keywords.length > 0 && (
                <Typography variant="body1">
                  Matched Keywords: {result.score.matched_keywords.join(', ')}
                </Typography>
              )}
            </Paper>
          )}

          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Feedback & Suggestions
            </Typography>
            {result.feedback.map((fb, index) => (
              <Typography
                key={index}
                variant="body1"
                sx={{
                  p: 2,
                  my: 1,
                  bgcolor: 'background.default',
                  borderLeft: 4,
                  borderColor: 'primary.main',
                }}
              >
                {fb}
              </Typography>
            ))}
          </Paper>
        </>
      )}
    </Container>
  );
};

export default InterviewCoach; 