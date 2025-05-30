
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Smile, List, HelpCircle, Zap, Brain, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { improveEmotionRecognition, type ImproveEmotionRecognitionInput } from '@/ai/flows/improve-emotion-recognition-flow';
import { summarizeEmotions, type EmotionSummaryInput } from '@/ai/flows/emotion-summary';

interface EmotionEntry {
  id: string;
  emotion: string;
  timestamp: Date;
  photoDataUri?: string;
  feedbackGiven?: boolean;
}

const PRESET_EMOTIONS = ["Happy", "Sad", "Neutral", "Surprised", "Angry", "Thinking", "Calm"];

export default function EmotionAIHomePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState<string | null>(null);
  const [emotionHistory, setEmotionHistory] = useState<EmotionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedbackEmotion, setFeedbackEmotion] = useState<string>("");
  const [otherFeedbackEmotion, setOtherFeedbackEmotion] = useState<string>("");
  const [currentFeedbackEntry, setCurrentFeedbackEntry] = useState<EmotionEntry | null>(null);
  const [dailySummary, setDailySummary] = useState<string | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState<'daily' | 'weekly' | 'monthly' | null>(null);

  const { toast } = useToast();

  const toggleCamera = async () => {
    if (isCameraOn) {
      stopCamera();
    } else {
      await startCamera();
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error("Video play failed:", e));
        };
        setIsCameraOn(true);
        setDetectedEmotion(null);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast({
        title: "Camera Error",
        description: "Could not access the camera. Please check permissions and ensure no other app is using it.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
    setDetectedEmotion("Camera Off");
    setIsAnalyzing(false);
  };

  const captureAndAnalyzeFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraOn || videoRef.current.paused || videoRef.current.ended || videoRef.current.videoWidth === 0) {
        if (isCameraOn) console.warn("Video not ready for capture");
        return;
    }

    setIsAnalyzing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
        setIsAnalyzing(false);
        return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoDataUri = canvas.toDataURL('image/jpeg', 0.8);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
      const randomEmotion = PRESET_EMOTIONS[Math.floor(Math.random() * PRESET_EMOTIONS.length)];
      setDetectedEmotion(randomEmotion);

      const newEntry: EmotionEntry = {
        id: `${new Date().toISOString()}-${Math.random()}`,
        emotion: randomEmotion,
        timestamp: new Date(),
        photoDataUri: photoDataUri,
      };
      setEmotionHistory(prev => [newEntry, ...prev.slice(0, 49)]);

    } catch (error) {
      console.error("Error recognizing emotion:", error);
      toast({
        title: "AI Error",
        description: "Could not recognize emotion. This is a mock error.",
        variant: "destructive",
      });
      setDetectedEmotion("Error");
    } finally {
      setIsAnalyzing(false);
    }
  }, [isCameraOn, toast]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    if (isCameraOn && !isAnalyzing) { 
      captureAndAnalyzeFrame(); 
      intervalId = setInterval(captureAndAnalyzeFrame, 7000); 
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isCameraOn, isAnalyzing, captureAndAnalyzeFrame]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);


  const handleFeedback = async (entry: EmotionEntry, correctedEmotionValue: string) => {
    if (!entry.photoDataUri || !correctedEmotionValue) {
        toast({ title: "Feedback Error", description: "Missing photo or corrected emotion.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    try {
        const input: ImproveEmotionRecognitionInput = {
            photoDataUri: entry.photoDataUri,
            detectedEmotion: entry.emotion,
            userFeedback: `User corrected emotion to: ${correctedEmotionValue}`,
        };
        const result = await improveEmotionRecognition(input);
        toast({
            title: "Feedback Submitted",
            description: "Thank you! Your feedback helps improve the AI.",
            className: "bg-accent text-accent-foreground border-accent",
        });
        console.log("AI Improvement Notes:", result.updatedModelNotes);
        setEmotionHistory(prev => prev.map(e => e.id === entry.id ? {...e, emotion: correctedEmotionValue, feedbackGiven: true } : e));
        setCurrentFeedbackEntry(null);
        setFeedbackEmotion("");
        setOtherFeedbackEmotion("");
    } catch (error) {
        console.error("Error submitting feedback:", error);
        toast({ title: "Feedback Error", description: "Could not submit feedback.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const fetchEmotionSummary = async (period: 'daily' | 'weekly' | 'monthly') => {
    if (emotionHistory.length === 0) {
        toast({ title: "No Data", description: `No emotion data available for ${period} summary.`, variant: "default" });
        return null;
    }

    setIsSummaryLoading(period);
    try {
        const input: EmotionSummaryInput = {
            emotionData: emotionHistory.map(entry => ({ emotion: entry.emotion, timestamp: entry.timestamp.toISOString() })),
            period: period,
        };
        const result = await summarizeEmotions(input);
        return result.summary;
    } catch (error) {
        console.error(`Error fetching ${period} summary:`, error);
        toast({ title: "Summary Error", description: `Could not fetch ${period} emotion summary.`, variant: "destructive" });
        return null;
    } finally {
        setIsSummaryLoading(null);
    }
  };

  useEffect(() => {
    const getDailySummary = async () => {
        if (emotionHistory.length > 0 && !dailySummary) {
            const summary = await fetchEmotionSummary('daily');
            setDailySummary(summary);
        }
    };
    const timer = setTimeout(getDailySummary, 2000); 
    return () => clearTimeout(timer);
  }, [emotionHistory, dailySummary]);

  const getEmotionEmoji = (emotion: string | null) => {
    if (!emotion) return "❓";
    switch (emotion.toLowerCase()) {
      case "happy": return "😄";
      case "sad": return "😢";
      case "angry": return "😠";
      case "surprised": return "😮";
      case "neutral": return "😐";
      case "thinking": return "🤔";
      case "calm": return "😌";
      case "camera off": return "🚫";
      case "loading...": return <Loader2 className="h-7 w-7 animate-spin text-primary" />;
      default: return "🧐";
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground p-4 md:p-8 font-sans">
      <header className="mb-6 md:mb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-primary flex items-center justify-center">
          <Brain className="w-10 h-10 sm:w-12 sm:h-12 mr-3 text-accent" />
          EmotionAI
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">Real-time emotion powered by Gemini.</p>
      </header>

      <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-xl rounded-xl overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center text-xl sm:text-2xl">
              <Camera className="w-6 h-6 mr-2 text-accent" /> Show Your Face
            </CardTitle>
            <CardDescription>Your real-time camera view for emotion analysis.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="aspect-[16/10] bg-muted rounded-lg overflow-hidden relative border-2 border-primary/20 shadow-inner">
              <video ref={videoRef} playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
              {!isCameraOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                  <Camera className="w-16 h-16 text-background/70 mb-4" />
                  <p className="text-background/90 text-lg">Camera is off</p>
                </div>
              )}
               {isCameraOn && isAnalyzing && !detectedEmotion && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-xs">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-2"/>
                  <p className="text-background/90 text-md">Analyzing initial frame...</p>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
              <Button onClick={toggleCamera} variant={isCameraOn ? "destructive" : "default"} className="w-full sm:w-auto shadow-md transition-all hover:shadow-lg">
                {isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
                <Zap className={`ml-2 w-5 h-5 ${isCameraOn ? '' : 'text-accent'}`} />
              </Button>
              {isCameraOn && (
                 <Button onClick={captureAndAnalyzeFrame} disabled={isAnalyzing} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground shadow-md transition-all hover:shadow-lg">
                 {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 w-5 h-5" />}
                 {isAnalyzing ? "Analyzing..." : "Analyze Now"}
               </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl rounded-xl overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center text-xl sm:text-2xl">
              <Smile className="w-6 h-6 mr-2 text-accent" /> Detected Emotion
            </CardTitle>
             <CardDescription>Current emotional.</CardDescription>
          </CardHeader>
          <CardContent className="text-center p-4 md:p-6 flex flex-col justify-center items-center min-h-[200px]">
            {(isAnalyzing && !detectedEmotion) || (isAnalyzing && detectedEmotion === "Camera Off") ? (
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-3"/>
                    <p className="text-lg">Detecting...</p>
                </div>
            ) : detectedEmotion ? (
                 <div className="my-4 p-4 sm:p-6 bg-primary/10 rounded-lg border border-primary/30 shadow-sm w-full">
                    <div className="text-6xl sm:text-7xl mb-3">{getEmotionEmoji(detectedEmotion)}</div>
                    <p className={`text-2xl sm:text-3xl font-semibold ${isAnalyzing ? 'text-muted-foreground animate-pulse' : 'text-primary'}`}>
                        {isAnalyzing && detectedEmotion !== "Camera Off" ? "Updating..." : detectedEmotion}
                    </p>
                 </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <HelpCircle className="w-12 h-12 mb-2"/>
                    <p>Turn on camera to detect emotion.</p>
                </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-3 shadow-xl rounded-xl overflow-hidden">
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-primary/10 rounded-none border-b">
              <TabsTrigger value="history" className="py-3 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-md rounded-none">
                <List className="w-4 h-4 mr-2" /> Emotion Log
              </TabsTrigger>
              <TabsTrigger value="summary" className="py-3 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-md rounded-none">
                <Brain className="w-4 h-4 mr-2" /> Summaries
              </TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="p-0">
              <Card className="rounded-none border-0">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <List className="w-5 h-5 mr-2 text-accent" /> Recent Emotions
                  </CardTitle>
                  <CardDescription>A log of your detected emotions.</CardDescription>
                </CardHeader>
                <CardContent className="max-h-[350px] overflow-hidden">
                  <ScrollArea className="h-[300px] pr-3">
                    {emotionHistory.length === 0 ? (
                      <p className="text-muted-foreground text-center py-10">No emotion data recorded yet. Turn on the camera and start analyzing!</p>
                    ) : (
                      <ul className="space-y-3">
                        {emotionHistory.map((entry) => (
                          <li key={entry.id} className="flex justify-between items-center p-3 bg-card hover:bg-secondary/20 rounded-lg border border-border/70 transition-all">
                            <div onClick={() => !entry.feedbackGiven && setCurrentFeedbackEntry(entry)} className="cursor-pointer flex-grow">
                              <span className="font-medium text-primary">{entry.emotion}</span> {getEmotionEmoji(entry.emotion)}
                              <p className="text-xs text-muted-foreground">
                                {new Date(entry.timestamp).toLocaleString()}
                              </p>
                            </div>
                             <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => { e.stopPropagation(); setCurrentFeedbackEntry(entry); }} 
                                className={`text-xs ${entry.feedbackGiven ? 'text-muted-foreground italic' : 'text-accent hover:text-accent-foreground hover:bg-accent/20'}`}
                                disabled={entry.feedbackGiven}
                              >
                                {entry.feedbackGiven ? 'Feedback Sent' : 'Give Feedback'}
                             </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="summary" className="p-0">
                <Card className="rounded-none border-0">
                    <CardHeader>
                        <CardTitle className="text-xl">Emotion Summaries</CardTitle>
                        <CardDescription>AI-generated summaries of your emotional trends.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 p-4 md:p-6">
                        <div>
                            <h3 className="font-semibold mb-1 text-primary flex items-center">
                                Current Summary 
                                {(isSummaryLoading === 'daily') && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                            </h3>
                            {dailySummary ? <p className="text-sm p-3 bg-secondary/20 rounded-md border border-primary/20 whitespace-pre-wrap">{dailySummary}</p> : <p className="text-sm text-muted-foreground">{(isSummaryLoading==='daily') ? 'Generating...' : 'Data not generated.'}</p>}
                        </div>
                        <div>
                            <h3 className="font-semibold mb-1 text-primary flex items-center">
                                Emotion Summary
                                <Button variant="link" size="sm" onClick={async () => setWeeklySummary(await fetchEmotionSummary('weekly'))} disabled={isSummaryLoading==='weekly'} className="ml-2 p-0 h-auto text-accent hover:text-accent/80">
                                    {(isSummaryLoading === 'weekly') ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                                    Generate
                                </Button>
                            </h3>
                             {weeklySummary ? <p className="text-sm p-3 bg-secondary/20 rounded-md border border-primary/20 whitespace-pre-wrap">{weeklySummary}</p> : <p className="text-sm text-muted-foreground">{(isSummaryLoading==='weekly') ? 'Generating...' : 'Click generate for summary.'}</p>}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {currentFeedbackEntry && (
         <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setCurrentFeedbackEntry(null)}>
            <Card className="w-full max-w-md shadow-2xl border-primary/50" onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                    <CardTitle>Improve Recognition</CardTitle>
                    <CardDescription>
                        Help us improve! AI detected "{currentFeedbackEntry.emotion}". What was the correct emotion?
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <select
                        value={feedbackEmotion}
                        onChange={(e) => setFeedbackEmotion(e.target.value)}
                        className="w-full p-2 border border-input rounded-md bg-background text-foreground focus:ring-1 focus:ring-accent focus:border-accent"
                    >
                        <option value="" disabled>Select correct emotion</option>
                        {PRESET_EMOTIONS.map(em => <option key={em} value={em}>{em}</option>)}
                        <option value="Other">Other (Specify below)</option>
                    </select>
                    {feedbackEmotion === "Other" && (
                        <Input
                            type="text"
                            placeholder="Specify other emotion"
                            value={otherFeedbackEmotion}
                            onChange={(e) => setOtherFeedbackEmotion(e.target.value)}
                            className="w-full focus:ring-1 focus:ring-accent focus:border-accent"
                        />
                    )}
                    <div className="flex justify-end space-x-2 pt-2">
                        <Button variant="outline" onClick={() => setCurrentFeedbackEntry(null)}>Cancel</Button>
                        <Button
                            onClick={() => {
                                const finalCorrectedEmotion = feedbackEmotion === "Other" ? otherFeedbackEmotion : feedbackEmotion;
                                handleFeedback(currentFeedbackEntry, finalCorrectedEmotion);
                            }}
                            disabled={isLoading || !feedbackEmotion || (feedbackEmotion === "Other" && !otherFeedbackEmotion)}
                            className="bg-accent hover:bg-accent/90 text-accent-foreground"
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Submit Feedback
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}
      <Toaster />
      <footer className="mt-10 md:mt-16 text-center text-xs sm:text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} EmotionAI. All rights reserved.</p>
        <p>Powered by Gemini and Next.js. Emotion recognition.</p>
      </footer>
    </div>
  );
}

