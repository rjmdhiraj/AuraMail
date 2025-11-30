// Voice-Enabled Email System - Main Application JavaScript

// API Configuration - Change this URL for production deployment
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001' 
    : 'https://your-backend-url.onrender.com'; // UPDATE THIS FOR PRODUCTION

class VoiceEmailApp {
    constructor() {
        // Application state
        this.currentScreen = 'login-screen';
        this.currentEmail = null;
        this.currentFolder = 'inbox';
        this.isListening = false;
        this.isReading = false;
        this.isDictating = false;
        this.shouldRestartRecognition = true;
        this.lastSpokenText = '';
        this.lastDictatedText = '';
        this.pendingCommand = null;
        
        // Voice and accessibility settings
        this.settings = {
            fontSize: 16,
            speechRate: 1.0,
            speechVolume: 0.8,
            highContrast: false,
            darkMode: this.getPreferredTheme(),
            voiceLanguage: 'en-US',
            autoReadEmails: true,
            confirmActions: true
        };

        // Sample email data
        this.emails = [
            {
                id: 1,
                from: "John Smith <john.smith@company.com>",
                subject: "Project Status Update - Q4 Milestone Review",
                timestamp: "2025-09-05T14:30:00Z",
                body: "Hi there,\n\nI wanted to provide you with an update on our Q4 project milestones. We've successfully completed the initial development phase and are now moving into testing.\n\nKey accomplishments this week:\n- Completed user interface redesign\n- Implemented new security features\n- Resolved 15 critical bugs\n\nNext steps:\n- Begin user acceptance testing\n- Prepare documentation\n- Schedule deployment meeting\n\nLet me know if you have any questions.\n\nBest regards,\nJohn",
                isRead: false,
                priority: "high",
                folder: "inbox",
                hasAttachment: true,
                isSpam: false
            },
            {
                id: 2,
                from: "Newsletter <newsletter@techcrunch.com>",
                subject: "Weekly Tech Newsletter - AI Advances in 2025",
                timestamp: "2025-09-05T09:15:00Z",
                body: "This week in technology:\n\n🤖 AI breakthroughs continue to reshape industries\n📱 New smartphone innovations announced\n🔒 Cybersecurity threats and solutions\n💡 Startup spotlight: Voice technology companies\n\nRead the full newsletter online for detailed coverage of these stories.",
                isRead: true,
                priority: "low",
                folder: "inbox",
                hasAttachment: false,
                isSpam: false
            },
            {
                id: 3,
                from: "Sarah Johnson <sarah.j@university.edu>",
                subject: "Research Collaboration Opportunity",
                timestamp: "2025-09-04T16:45:00Z",
                body: "Dear Colleague,\n\nI hope this message finds you well. I'm reaching out regarding a potential research collaboration on accessibility technology.\n\nOur team is working on innovative voice interface solutions for users with visual impairments. Your expertise in this area would be invaluable to our project.\n\nWould you be interested in discussing this opportunity further? I'm available for a call next week.\n\nSincerely,\nDr. Sarah Johnson",
                isRead: false,
                priority: "medium",
                folder: "inbox",
                hasAttachment: false,
                isSpam: false
            },
            {
                id: 4,
                from: "Banking Alert <alerts@securebank.com>",
                subject: "Account Security Verification Required",
                timestamp: "2025-09-04T11:20:00Z",
                body: "URGENT: Your account requires immediate verification.\n\nClick here to verify your account: [suspicious link]\n\nFailure to verify within 24 hours will result in account suspension.\n\nSecure Bank Customer Service",
                isRead: false,
                priority: "urgent",
                folder: "spam",
                hasAttachment: false,
                isSpam: true
            },
            {
                id: 5,
                from: "Mom <mom@family.com>",
                subject: "Family Dinner This Sunday",
                timestamp: "2025-09-03T19:30:00Z",
                body: "Hi sweetie,\n\nJust wanted to remind you about family dinner this Sunday at 6 PM. Your sister will be visiting from college, so it would be wonderful if you could join us.\n\nI'm making your favorite lasagna! Let me know if you can make it.\n\nLove,\nMom\n\nP.S. - Don't forget to call your grandmother, she's been asking about you.",
                isRead: true,
                priority: "medium",
                folder: "inbox",
                hasAttachment: false,
                isSpam: false
            },
            {
                id: 6,
                from: "Calendar <calendar@google.com>",
                subject: "Meeting Reminder: Team Standup in 1 hour",
                timestamp: "2025-09-05T08:00:00Z",
                body: "Reminder: You have a meeting in 1 hour\n\nTeam Standup\nTime: 9:00 AM - 9:30 AM\nLocation: Conference Room A / Zoom\n\nAgenda:\n- Sprint progress review\n- Blockers discussion\n- Next week planning\n\nJoin Zoom Meeting: [meeting link]",
                isRead: true,
                priority: "high",
                folder: "inbox",
                hasAttachment: false,
                isSpam: false
            }
        ];

        // Voice command mappings
        this.voiceCommands = {
            'sign in': () => this.signInWithVoice(),
            'login': () => this.signInWithVoice(),
            'read inbox': () => this.readAllEmails(),
            'read all emails': () => this.readAllEmails(),
            'compose email': () => this.showCompose(),
            'show settings': () => this.showSettings(),
            'read email': () => this.readCurrentEmail(),
            'reply': () => this.replyToEmail(),
            'forward': () => this.forwardEmail(),
            'delete': () => this.deleteCurrentEmail(),
            'mark as spam': () => this.markAsSpam(),
            'search emails': () => this.openSearch(),
            'help': () => this.showHelp(),
            'repeat': () => this.repeatLastSpoken(),
            'louder': () => this.increaseVolume(),
            'quieter': () => this.decreaseVolume(),
            'high contrast': () => this.toggleContrast(),
            'toggle contrast': () => this.toggleContrast(),
            'larger text': () => this.confirmLargerText(),
            'confirm larger text': () => this.increaseFontSize(),
            'go back': () => this.navigateBack(),
            'start dictating': () => this.startDictation(),
            'stop dictating': () => this.stopDictation(),
            'dictate recipient': () => this.dictateRecipient(),
            'dictate subject': () => this.dictateSubject(),
            'dictate message': () => this.dictateMessage(),
            'send email': () => this.confirmAndSendEmail(),
            'confirm send': () => this.sendEmail(),
            'save draft': () => this.confirmAndSaveDraft(),
            'confirm save': () => this.saveDraft(),
            'cancel message': () => this.cancelCompose(),
            'cancel': () => this.cancelCurrentAction()
        };

        this.voiceSupported = false;
        this.speechSupported = false;
    }

    init() {
        try {
            // Initialize voice and event listeners first
            this.initializeVoiceAPIs();
            this.setupEventListeners();
            this.loadSettings();
            
            // Check for OAuth callback
            const urlParams = new URLSearchParams(window.location.search);
            const authStatus = urlParams.get('auth');
            const token = urlParams.get('token');
            const error = urlParams.get('error');
            
            if (authStatus === 'success' && token) {
                // Store the JWT token
                localStorage.setItem('authToken', token);
                
                this.showLoadingOverlay('Loading your emails...');
                
                // Clean URL
                window.history.replaceState({}, document.title, '/');
                
                // Start voice recognition
                setTimeout(() => {
                    this.startVoiceRecognition();
                }, 500);
                
                setTimeout(() => {
                    this.hideLoadingOverlay();
                    this.speak('Successfully signed in. Loading your inbox.');
                    this.showToast('Successfully signed in with Google', 'success');
                    this.navigateToInbox();
                }, 1000);
                return;
            } else if (authStatus === 'failed') {
                this.showToast(`Authentication failed: ${error || 'Unknown error'}`, 'error');
                this.speak('Authentication failed. Please try again.');
                
                // Clean URL
                window.history.replaceState({}, document.title, '/');
            }
            
            // Check if user is already authenticated
            const existingToken = localStorage.getItem('authToken');
            if (existingToken) {
                // User is already logged in, go to inbox
                this.showLoadingOverlay('Loading your emails...');
                setTimeout(() => {
                    this.startVoiceRecognition();
                }, 500);
                setTimeout(() => {
                    this.hideLoadingOverlay();
                    this.navigateToInbox();
                }, 1000);
                return;
            }
            
            // No auth token, show login screen
            this.showScreen('login-screen');
            
            // Check if this is first visit
            const hasSeenTour = localStorage.getItem('hasSeenVoiceTour');
            
            if (!hasSeenTour) {
                // First-time user, start voice tour automatically
                setTimeout(() => {
                    this.speak("Welcome to Voice-Enabled Email System. Starting voice tour to guide you through features.");
                    // Start the tour after welcome message
                    setTimeout(() => {
                        this.startVoiceTour();
                        // Mark tour as seen
                        localStorage.setItem('hasSeenVoiceTour', 'true');
                    }, 5000);
                }, 1000);
            } else {
                // Returning user, show standard welcome
                setTimeout(() => {
                    this.speak("Welcome to Voice-Enabled Email System. Press the tutorial button to learn voice commands, or sign in with Google to continue.");
                }, 1000);
            }
            
            // Start voice recognition if supported
            setTimeout(() => {
                this.startVoiceRecognition();
            }, 2000);
        } catch (error) {
            console.error('Initialization error:', error);
            this.updateVoiceStatus('error', 'Application initialization failed');
        }
    }

    initializeVoiceAPIs() {
        try {
            // Initialize Speech Recognition
            if ('webkitSpeechRecognition' in window) {
                this.recognition = new webkitSpeechRecognition();
                this.voiceSupported = true;
            } else if ('SpeechRecognition' in window) {
                this.recognition = new SpeechRecognition();
                this.voiceSupported = true;
            } else {
                console.warn('Speech recognition not supported');
                this.updateVoiceStatus('error', 'Voice recognition not supported');
                this.voiceSupported = false;
            }

            if (this.recognition) {
                this.recognition.continuous = true;
                this.recognition.interimResults = true;
                this.recognition.lang = this.settings.voiceLanguage;

                this.recognition.onstart = () => {
                    this.updateVoiceStatus('listening', 'Listening for commands...');
                    this.isListening = true;
                };

                this.recognition.onresult = (event) => {
                    let finalTranscript = '';
                    let interimTranscript = '';

                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            finalTranscript += transcript;
                        } else {
                            interimTranscript += transcript;
                        }
                    }

                    // Handle dictation mode first (takes priority)
                    if (this.isDictating && finalTranscript) {
                        this.handleDictation(finalTranscript);
                    } else if (finalTranscript.trim()) {
                        // Only process as command if not in dictation mode
                        this.processVoiceCommand(finalTranscript.toLowerCase().trim());
                    }
                };

                this.recognition.onerror = (event) => {
                    // Ignore 'aborted' errors - they're expected when we stop recognition for speech
                    if (event.error === 'aborted') {
                        console.log('Recognition aborted (expected during speech)');
                        this.isListening = false;
                        return;
                    }
                    
                    console.error('Speech recognition error:', event.error);
                    if (event.error === 'not-allowed') {
                        this.updateVoiceStatus('error', 'Microphone permission denied');
                        this.isListening = false;
                    } else if (event.error === 'no-speech') {
                        // Don't show error for 'no-speech' - it's normal, just quiet
                        console.log('No speech detected');
                    } else {
                        this.updateVoiceStatus('error', 'Voice recognition unavailable');
                        this.isListening = false;
                    }
                };

                this.recognition.onend = () => {
                    this.isListening = false;
                    if (this.voiceSupported && this.shouldRestartRecognition) {
                        setTimeout(() => {
                            try {
                                if (!this.isListening) {
                                    this.recognition.start();
                                    this.isListening = true;
                                }
                            } catch (error) {
                                if (!error.message?.includes('already started')) {
                                    console.error('Failed to restart recognition:', error);
                                    this.updateVoiceStatus('inactive', 'Voice commands ready (click to activate)');
                                }
                            }
                        }, 100);
                    } else {
                        this.updateVoiceStatus('inactive', 'Voice commands ready');
                    }
                };
            }

            // Initialize Speech Synthesis
            if ('speechSynthesis' in window) {
                this.synthesis = window.speechSynthesis;
                this.speechSupported = true;
                this.currentVoice = null;
                
                if (this.synthesis) {
                    this.synthesis.onvoiceschanged = () => {
                        this.updateVoiceSelection();
                    };
                    this.updateVoiceSelection();
                }
            } else {
                console.warn('Speech synthesis not supported');
                this.speechSupported = false;
            }

            if (!this.voiceSupported && !this.speechSupported) {
                this.updateVoiceStatus('error', 'Voice features not supported');
            } else if (!this.voiceSupported) {
                this.updateVoiceStatus('inactive', 'Voice commands not supported');
            } else {
                this.updateVoiceStatus('inactive', 'Voice commands ready');
            }

        } catch (error) {
            console.error('Voice API initialization error:', error);
            this.updateVoiceStatus('error', 'Voice initialization failed');
            this.voiceSupported = false;
            this.speechSupported = false;
        }
    }

    updateVoiceSelection() {
        if (!this.synthesis) return;
        
        try {
            const voices = this.synthesis.getVoices();
            if (voices.length === 0) {
                // Try again after a delay if voices aren't loaded yet
                setTimeout(() => this.updateVoiceSelection(), 100);
                return;
            }
            
            this.currentVoice = voices.find(voice => 
                voice.lang.startsWith(this.settings.voiceLanguage.substring(0, 2))
            ) || voices[0];
            
            console.log('Voice selected:', this.currentVoice?.name || 'Default');
        } catch (error) {
            console.error('Voice selection error:', error);
        }
    }

    startVoiceRecognition() {
        if (this.recognition && !this.isListening && this.voiceSupported) {
            try {
                this.recognition.start();
                this.isListening = true;
            } catch (error) {
                // Ignore "already started" errors
                if (error.message && error.message.includes('already started')) {
                    console.log('Voice recognition already running');
                    this.isListening = true;
                } else {
                    console.error('Failed to start voice recognition:', error);
                    this.updateVoiceStatus('error', 'Click to activate voice');
                }
            }
        }
    }

    stopVoiceRecognition() {
        if (this.recognition && this.isListening) {
            this.isListening = false;
            try {
                this.recognition.stop();
                this.updateVoiceStatus('inactive', 'Voice commands ready');
            } catch (error) {
                console.error('Failed to stop voice recognition:', error);
            }
        }
    }

    async speak(text, interrupt = false) {
        // Use browser TTS directly (Python backend has Google rate limits)
        this.speakWithBrowser(text, interrupt);
    }

    async speakWithAI(text, interrupt = false) {
        // Stop recognition while speaking to avoid conflicts
        if (this.recognition && this.isListening) {
            this.shouldRestartRecognition = false;
            this.recognition.stop();
            this.isListening = false;
        }

        this.updateVoiceStatus('speaking', 'Speaking...');
        this.isReading = true;

        try {
            const response = await fetch('http://localhost:5001/api/text-to-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    language: this.settings.voiceLanguage.substring(0, 2)
                })
            });

            if (!response.ok) {
                throw new Error('TTS API failed');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                this.updateVoiceStatus('listening', 'Listening for commands...');
                this.isReading = false;
                
                // Restart voice recognition after speaking
                this.shouldRestartRecognition = true;
                setTimeout(() => {
                    if (!this.isListening && this.voiceSupported && this.recognition) {
                        this.startVoiceRecognition();
                    }
                }, 300);
            };

            audio.onerror = () => {
                URL.revokeObjectURL(audioUrl);
                throw new Error('Audio playback failed');
            };

            await audio.play();
            this.lastSpokenText = text;
        } catch (error) {
            this.isReading = false;
            this.shouldRestartRecognition = true;
            throw error;
        }
    }

    speakWithBrowser(text, interrupt = false) {
        if (!this.synthesis || !this.speechSupported) {
            console.log('Text to speak:', text);
            return;
        }

        try {
            // Stop recognition while speaking to avoid conflicts
            if (this.recognition && this.isListening) {
                this.shouldRestartRecognition = false;
                this.recognition.stop();
                this.isListening = false;
            }

            // Only cancel if explicitly requested AND there's something speaking
            if (interrupt && this.synthesis.speaking) {
                this.synthesis.cancel();
                // Wait a bit for cancellation to complete
                setTimeout(() => this.speakWithBrowser(text, false), 100);
                return;
            }

            // Ensure voices are loaded
            const voices = this.synthesis.getVoices();
            if (voices.length === 0) {
                console.warn('No voices loaded yet, waiting...');
                setTimeout(() => this.speakWithBrowser(text, interrupt), 100);
                return;
            }

            // Split long text into chunks (Web Speech API has issues with long text)
            const maxChunkLength = 200; // Characters per chunk
            const chunks = this.splitTextIntoChunks(text, maxChunkLength);
            console.log('Speaking text in', chunks.length, 'chunks');
            
            let currentChunk = 0;
            
            const speakNextChunk = () => {
                if (currentChunk >= chunks.length) {
                    // All chunks done
                    console.log('All chunks spoken, restarting recognition');
                    this.isReading = false;
                    this.shouldRestartRecognition = true;
                    setTimeout(() => {
                        if (!this.isListening && this.voiceSupported && this.recognition) {
                            console.log('Attempting to restart recognition');
                            this.startVoiceRecognition();
                        }
                    }, 500);
                    return;
                }
                
                const chunk = chunks[currentChunk];
                console.log('Speaking chunk', currentChunk + 1, 'of', chunks.length, ':', chunk.substring(0, 50) + '...');
                
                const utterance = new SpeechSynthesisUtterance(chunk);
                if (this.currentVoice) {
                    utterance.voice = this.currentVoice;
                } else if (voices.length > 0) {
                    utterance.voice = voices[0];
                }
                utterance.rate = this.settings.speechRate;
                utterance.volume = this.settings.speechVolume;

                utterance.onstart = () => {
                    if (currentChunk === 0) {
                        this.updateVoiceStatus('speaking', 'Speaking...');
                        this.isReading = true;
                    }
                };

                utterance.onend = () => {
                    currentChunk++;
                    speakNextChunk();
                };

                utterance.onerror = (event) => {
                    console.error('Speech synthesis error on chunk', currentChunk, ':', event.error);
                    // Try next chunk anyway
                    currentChunk++;
                    speakNextChunk();
                };

                this.synthesis.speak(utterance);
            };
            
            this.lastSpokenText = text;
            speakNextChunk();
            
        } catch (error) {
            console.error('Speech synthesis error:', error);
            this.shouldRestartRecognition = true;
        }
    }
    
    splitTextIntoChunks(text, maxLength) {
        const chunks = [];
        const sentences = text.split(/(?<=[.!?])\s+/);
        let currentChunk = '';
        
        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length <= maxLength) {
                currentChunk += (currentChunk ? ' ' : '') + sentence;
            } else {
                if (currentChunk) {
                    chunks.push(currentChunk);
                }
                // If single sentence is longer than maxLength, split by words
                if (sentence.length > maxLength) {
                    const words = sentence.split(' ');
                    currentChunk = '';
                    for (const word of words) {
                        if (currentChunk.length + word.length + 1 <= maxLength) {
                            currentChunk += (currentChunk ? ' ' : '') + word;
                        } else {
                            if (currentChunk) chunks.push(currentChunk);
                            currentChunk = word;
                        }
                    }
                } else {
                    currentChunk = sentence;
                }
            }
        }
        if (currentChunk) {
            chunks.push(currentChunk);
        }
        
        return chunks.length > 0 ? chunks : [text];
    }

    updateVoiceStatus(status, text) {
        try {
            const statusElement = document.getElementById('voice-status');
            const statusIcon = document.getElementById('status-icon');
            const statusText = document.getElementById('status-text');

            if (!statusElement || !statusIcon || !statusText) return;

            statusElement.className = `voice-status ${status}`;
            statusText.textContent = text;

            switch (status) {
                case 'listening':
                    statusIcon.className = 'fas fa-microphone';
                    break;
                case 'speaking':
                    statusIcon.className = 'fas fa-volume-up';
                    break;
                case 'processing':
                    statusIcon.className = 'fas fa-cog fa-spin';
                    break;
                case 'error':
                    statusIcon.className = 'fas fa-exclamation-triangle';
                    break;
                default:
                    statusIcon.className = 'fas fa-microphone-slash';
            }
        } catch (error) {
            console.error('Voice status update error:', error);
        }
    }

    processVoiceCommand(command) {
        console.log('Processing voice command:', command);
        this.updateVoiceStatus('processing', 'Processing command...');

        try {
            // Normalize command
            const normalizedCommand = command.toLowerCase().trim();
            
            // Find matching command - check for exact match or partial match
            let matchedCommand = null;
            
            // First try exact match
            if (this.voiceCommands[normalizedCommand]) {
                matchedCommand = normalizedCommand;
            } else {
                // Try partial match - find the longest matching command
                const possibleMatches = Object.keys(this.voiceCommands)
                    .filter(cmd => normalizedCommand.includes(cmd))
                    .sort((a, b) => b.length - a.length); // Sort by length descending
                
                if (possibleMatches.length > 0) {
                    matchedCommand = possibleMatches[0];
                }
            }

            if (matchedCommand) {
                if (this.settings.confirmActions && this.isDestructiveCommand(matchedCommand)) {
                    this.speak(`Are you sure you want to ${matchedCommand}? Say "yes" to confirm or "no" to cancel.`);
                    this.pendingCommand = matchedCommand;
                    return;
                }
                
                this.voiceCommands[matchedCommand]();
                this.showToast(`Command executed: ${matchedCommand}`, 'success');
            } else if (this.pendingCommand) {
                if (command.includes('yes') || command.includes('confirm')) {
                    this.voiceCommands[this.pendingCommand]();
                    this.showToast(`Command executed: ${this.pendingCommand}`, 'success');
                    this.pendingCommand = null;
                } else if (command.includes('no') || command.includes('cancel')) {
                    this.speak('Command cancelled.');
                    this.showToast('Cancelled', 'info');
                    this.pendingCommand = null;
                }
            } else {
                this.speak("Command not recognized. Say 'help' to hear available commands.");
                this.showToast('Command not recognized', 'error');
            }

            setTimeout(() => {
                this.updateVoiceStatus('listening', 'Listening for commands...');
            }, 1000);
        } catch (error) {
            console.error('Voice command processing error:', error);
            this.updateVoiceStatus('error', 'Command processing failed');
        }
    }

    isDestructiveCommand(command) {
        const destructiveCommands = ['delete', 'mark as spam'];
        return destructiveCommands.includes(command);
    }

    handleDictation(text) {
        try {
            const lowerText = text.toLowerCase();
            
            // Check for stop command
            if (lowerText.includes('stop dictating')) {
                this.stopDictation();
                return;
            }
            
            const activeElement = document.activeElement;
            
            if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
                // Filter out command phrases
                let cleanText = text
                    .replace(/start dictating/gi, '')
                    .replace(/stop dictating/gi, '')
                    .replace(/start dictation/gi, '')
                    .replace(/stop dictation/gi, '')
                    .trim();
                
                // Only add non-empty text and avoid duplicates
                if (cleanText && cleanText !== this.lastDictatedText) {
                    let textToAdd = cleanText;
                    
                    // Special handling for email input fields
                    if (activeElement.type === 'email' || activeElement.id === 'compose-to') {
                        // Always remove spaces for email fields and convert to lowercase
                        textToAdd = cleanText.replace(/\s+/g, '').toLowerCase();
                        // Convert common voice dictation patterns for email
                        textToAdd = textToAdd
                            .replace(/\bat\b/g, '@')
                            .replace(/\bdot\b/g, '.')
                            .replace(/\bunderscore\b/g, '_')
                            .replace(/\bdash\b/g, '-');
                    } else {
                        // For non-email fields, add space before if needed
                        if (activeElement.value && !activeElement.value.endsWith(' ')) {
                            textToAdd = ' ' + cleanText;
                        }
                    }
                    
                    activeElement.value += textToAdd;
                    this.lastDictatedText = cleanText;
                    
                    // Clear the last dictated text after a short delay to allow new input
                    setTimeout(() => {
                        this.lastDictatedText = '';
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('Dictation error:', error);
        }
    }

    startDictation() {
        this.isDictating = true;
        const voiceRecording = document.getElementById('voice-recording');
        if (voiceRecording) {
            voiceRecording.style.display = 'block';
        }
        this.speak('Dictation started. Speak your message. Say "stop dictating" when finished.');
        this.showToast('Dictation mode activated', 'info');
    }

    stopDictation() {
        this.isDictating = false;
        this.lastDictatedText = '';
        const voiceRecording = document.getElementById('voice-recording');
        if (voiceRecording) {
            voiceRecording.style.display = 'none';
        }
        this.speak('Dictation stopped.');
        this.showToast('Dictation mode deactivated', 'info');
    }
    
    dictateRecipient() {
        const recipientField = document.getElementById('compose-to');
        if (recipientField) {
            recipientField.focus();
            this.isDictating = true;
            const voiceRecording = document.getElementById('voice-recording');
            if (voiceRecording) {
                voiceRecording.style.display = 'block';
            }
            this.speak('Dictating recipient. Speak the email address. For example, say: john dot smith at company dot com');
            this.showToast('Dictation mode: Recipient', 'info');
        } else {
            this.speak('Please open the compose screen first.');
        }
    }
    
    dictateSubject() {
        const subjectField = document.getElementById('compose-subject');
        if (subjectField) {
            subjectField.focus();
            this.isDictating = true;
            const voiceRecording = document.getElementById('voice-recording');
            if (voiceRecording) {
                voiceRecording.style.display = 'block';
            }
            this.speak('Dictating subject. Speak the email subject.');
            this.showToast('Dictation mode: Subject', 'info');
        } else {
            this.speak('Please open the compose screen first.');
        }
    }
    
    dictateMessage() {
        const bodyField = document.getElementById('compose-body');
        if (bodyField) {
            bodyField.focus();
            this.isDictating = true;
            const voiceRecording = document.getElementById('voice-recording');
            if (voiceRecording) {
                voiceRecording.style.display = 'block';
            }
            this.speak('Dictating message. Speak your email message.');
            this.showToast('Dictation mode: Message', 'info');
        } else {
            this.speak('Please open the compose screen first.');
        }
    }
    
    confirmAndSendEmail() {
        try {
            const to = document.getElementById('compose-to')?.value.trim();
            const subject = document.getElementById('compose-subject')?.value.trim();
            const body = document.getElementById('compose-body')?.value.trim();
            
            if (!to) {
                this.speak('Please enter a recipient email address.');
                this.showToast('Recipient required', 'error');
                return;
            }
            
            if (!subject) {
                this.speak('Please enter a subject.');
                this.showToast('Subject required', 'error');
                return;
            }
            
            if (!body) {
                this.speak('Please enter a message.');
                this.showToast('Message required', 'error');
                return;
            }
            
            // Read back the email for confirmation
            const confirmation = `Ready to send email. Recipient: ${to}. Subject: ${subject}. Message: ${body.substring(0, 100)}${body.length > 100 ? '... and more' : ''}. Say "confirm send" to send, or "cancel" to go back.`;
            this.speak(confirmation);
            this.showToast('Confirm to send', 'info');
        } catch (error) {
            console.error('Email confirmation error:', error);
            this.speak('Unable to confirm email.');
        }
    }

    setupEventListeners() {
        try {
            // Theme toggle button
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.toggleDarkMode();
                });
            }

            // Login screen events
            const oauthBtn = document.getElementById('oauth-btn');
            if (oauthBtn) {
                oauthBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('OAuth button clicked');
                    this.simulateOAuth();
                });
            }

            const tutorialBtn = document.getElementById('tutorial-btn');
            if (tutorialBtn) {
                tutorialBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Tutorial button clicked');
                    this.showHelp();
                });
            }

            // Navigation events
            const composeBtn = document.getElementById('compose-btn');
            if (composeBtn) {
                composeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showCompose();
                });
            }

            const settingsBtn = document.getElementById('settings-btn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showSettings();
                });
            }

            const backToInbox = document.getElementById('back-to-inbox');
            if (backToInbox) {
                backToInbox.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.navigateToInbox();
                });
            }

            const backFromReader = document.getElementById('back-from-reader');
            if (backFromReader) {
                backFromReader.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.navigateToInbox();
                });
            }

            const backFromSettings = document.getElementById('back-from-settings');
            if (backFromSettings) {
                backFromSettings.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.navigateBack();
                });
            }

            // Logout button
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logout();
                });
            }

            // Folder navigation
            document.querySelectorAll('.folder-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const folder = e.target.closest('.folder-link').dataset.folder;
                    this.switchFolder(folder);
                });
            });

            // Email composition events
            const composeForm = document.getElementById('compose-form');
            if (composeForm) {
                composeForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.sendEmail();
                });
            }

            const dictateBtn = document.getElementById('dictate-btn');
            if (dictateBtn) {
                dictateBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.startDictation();
                });
            }

            const saveDraftBtn = document.getElementById('save-draft');
            if (saveDraftBtn) {
                saveDraftBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.saveDraft();
                });
            }

            // Email reader events
            const replyBtn = document.getElementById('reply-btn');
            if (replyBtn) {
                replyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.replyToEmail();
                });
            }

            const forwardBtn = document.getElementById('forward-btn');
            if (forwardBtn) {
                forwardBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.forwardEmail();
                });
            }

            const deleteBtn = document.getElementById('delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.deleteCurrentEmail();
                });
            }

            const readEmailBtn = document.getElementById('read-email-btn');
            if (readEmailBtn) {
                readEmailBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.readCurrentEmail();
                });
            }

            const pauseReadingBtn = document.getElementById('pause-reading-btn');
            if (pauseReadingBtn) {
                pauseReadingBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.pauseReading();
                });
            }

            const stopReadingBtn = document.getElementById('stop-reading-btn');
            if (stopReadingBtn) {
                stopReadingBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.stopReading();
                });
            }

            // Settings events
            this.setupSettingsEventListeners();

            // Help modal events
            const startVoiceTourBtn = document.getElementById('start-voice-tour');
            if (startVoiceTourBtn) {
                startVoiceTourBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.startVoiceTour();
                });
            }

            // Keyboard navigation
            document.addEventListener('keydown', (e) => {
                this.handleKeyboardNavigation(e);
            });

            // Refresh and search
            const refreshBtn = document.getElementById('refresh-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.refreshEmails();
                });
            }

            const searchBtn = document.getElementById('search-btn');
            if (searchBtn) {
                searchBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.openSearch();
                });
            }

            // Voice status click to activate
            const voiceStatus = document.getElementById('voice-status');
            if (voiceStatus) {
                voiceStatus.addEventListener('click', () => {
                    if (!this.isListening && this.voiceSupported) {
                        this.startVoiceRecognition();
                    }
                });
            }

        } catch (error) {
            console.error('Event listener setup error:', error);
        }
    }

    setupSettingsEventListeners() {
        try {
            // Font size
            const fontSizeSlider = document.getElementById('font-size');
            if (fontSizeSlider) {
                fontSizeSlider.addEventListener('input', (e) => {
                    const value = e.target.value;
                    this.settings.fontSize = parseInt(value);
                    const valueDisplay = document.getElementById('font-size-value');
                    if (valueDisplay) {
                        valueDisplay.textContent = `${value}px`;
                    }
                    document.body.style.fontSize = `${value}px`;
                });
            }

            // Speech rate
            const speechRateSlider = document.getElementById('speech-rate');
            if (speechRateSlider) {
                speechRateSlider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    this.settings.speechRate = value;
                    const speedText = value < 1 ? 'Slow' : value > 1 ? 'Fast' : 'Normal';
                    const valueDisplay = document.getElementById('speech-rate-value');
                    if (valueDisplay) {
                        valueDisplay.textContent = `${value}x (${speedText})`;
                    }
                });
            }

            // Speech volume
            const speechVolumeSlider = document.getElementById('speech-volume');
            if (speechVolumeSlider) {
                speechVolumeSlider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    this.settings.speechVolume = value;
                    const valueDisplay = document.getElementById('speech-volume-value');
                    if (valueDisplay) {
                        valueDisplay.textContent = `${Math.round(value * 100)}%`;
                    }
                });
            }

            // High contrast
            const highContrastToggle = document.getElementById('high-contrast');
            if (highContrastToggle) {
                highContrastToggle.addEventListener('change', (e) => {
                    this.settings.highContrast = e.target.checked;
                    this.toggleContrast(e.target.checked);
                });
            }

            // Other settings
            const voiceLanguageSelect = document.getElementById('voice-language');
            if (voiceLanguageSelect) {
                voiceLanguageSelect.addEventListener('change', (e) => {
                    this.settings.voiceLanguage = e.target.value;
                    if (this.recognition) {
                        this.recognition.lang = e.target.value;
                    }
                    this.updateVoiceSelection();
                });
            }

            const autoReadToggle = document.getElementById('auto-read');
            if (autoReadToggle) {
                autoReadToggle.addEventListener('change', (e) => {
                    this.settings.autoReadEmails = e.target.checked;
                });
            }

            const confirmActionsToggle = document.getElementById('confirm-actions');
            if (confirmActionsToggle) {
                confirmActionsToggle.addEventListener('change', (e) => {
                    this.settings.confirmActions = e.target.checked;
                });
            }

            // Settings buttons
            const testVoiceBtn = document.getElementById('test-voice');
            if (testVoiceBtn) {
                testVoiceBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.speak('This is a test of your current voice settings.');
                });
            }

            const resetSettingsBtn = document.getElementById('reset-settings');
            if (resetSettingsBtn) {
                resetSettingsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.resetSettings();
                });
            }
        } catch (error) {
            console.error('Settings event listener setup error:', error);
        }
    }

    signInWithVoice() {
        // Check if user is already signed in
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
            this.speak('You are already signed in.');
            this.showToast('Already signed in', 'info');
            return;
        }
        
        // Trigger sign-in process
        this.speak('Starting sign in with Google.');
        this.simulateOAuth();
    }

    async simulateOAuth() {
        console.log('Starting Google OAuth');
        this.showLoadingOverlay('Connecting to Google...');
        
        try {
            // Get auth URL from backend
            const response = await fetch(`${API_BASE_URL}/api/auth/google`);
            const data = await response.json();
            
            if (data.success && data.authUrl) {
                // Redirect to Google's OAuth page
                window.location.href = data.authUrl;
            } else {
                throw new Error('Failed to get authorization URL');
            }
        } catch (error) {
            console.error('OAuth error:', error);
            this.hideLoadingOverlay();
            this.speak('Failed to connect to Google. Please try again.');
            this.showToast('Failed to connect to Google', 'error');
        }
    }
    
    async fetchRealEmails() {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            throw new Error('Not authenticated');
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/emails?limit=100`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                this.showToast('Session expired. Please sign in again.', 'error');
                this.showScreen('login-screen');
                throw new Error('Authentication expired');
            }
            
            if (!response.ok) {
                throw new Error(`Failed to fetch emails: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.emails) {
                this.emails = data.emails.map((email, index) => {
                    const labelIds = email.labelIds || [];
                    let folder = 'inbox';
                    
                    if (labelIds.includes('SENT')) folder = 'sent';
                    else if (labelIds.includes('DRAFT')) folder = 'drafts';
                    else if (labelIds.includes('SPAM')) folder = 'spam';
                    else if (labelIds.includes('TRASH')) folder = 'trash';
                    
                    return {
                        id: email.id || index + 1,
                        from: email.from || 'Unknown Sender',
                        to: email.to || '',
                        subject: email.subject || '(No Subject)',
                        timestamp: email.date || email.internalDate || new Date().toISOString(),
                        body: email.body || email.snippet || '',
                        htmlBody: email.htmlBody || '',
                        textBody: email.textBody || email.body || '',
                        attachments: email.attachments || [],
                        isRead: !email.isUnread,
                        priority: 'normal',
                        folder: folder,
                        hasAttachment: email.hasAttachments || false,
                        isSpam: folder === 'spam',
                        labelIds: labelIds
                    };
                });
                console.log(`Loaded ${this.emails.length} real emails`);
            }
        } catch (error) {
            console.error('Error fetching real emails:', error);
            throw error;
        }
    }

    showScreen(screenId) {
        try {
            console.log('Showing screen:', screenId);
            
            // Hide all screens
            document.querySelectorAll('.screen').forEach(screen => {
                screen.classList.remove('active');
            });

            // Show target screen
            const targetScreen = document.getElementById(screenId);
            if (targetScreen) {
                targetScreen.classList.add('active');
                this.currentScreen = screenId;

                // Focus management
                const focusTarget = targetScreen.querySelector('h1, h2, [autofocus]');
                if (focusTarget) {
                    setTimeout(() => focusTarget.focus(), 100);
                }
            } else {
                console.error('Screen not found:', screenId);
            }
        } catch (error) {
            console.error('Show screen error:', error);
        }
    }

    async navigateToInbox() {
        console.log('Navigating to inbox');
        
        // Stop any ongoing speech when leaving email reader
        if (this.synthesis && this.synthesis.speaking) {
            this.synthesis.cancel();
            this.isReading = false;
        }
        
        this.showScreen('dashboard-screen');
        this.currentFolder = 'inbox';
        this.updateFolderDisplay();
        
        // Fetch real emails if authenticated
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
            this.showLoadingOverlay('Loading your emails...');
            try {
                await this.fetchRealEmails();
                this.hideLoadingOverlay();
            } catch (error) {
                console.error('Failed to load emails:', error);
                this.hideLoadingOverlay();
                this.showToast('Failed to load emails', 'error');
            }
        }
        
        this.renderEmailList();
        this.speak(`Inbox loaded. You have ${this.getUnreadCount()} unread emails.`);
    }

    showCompose() {
        this.showScreen('compose-screen');
        this.clearComposeForm();
        this.speak('Compose email screen opened. Please enter the recipient email address, or say "start dictating" to use voice input.');
        
        // Setup focus event listeners for better guidance
        this.setupComposeFieldListeners();
        
        // Focus on the 'To' field
        setTimeout(() => {
            const composeToField = document.getElementById('compose-to');
            if (composeToField) {
                composeToField.focus();
            }
        }, 100);
    }
    
    setupComposeFieldListeners() {
        const composeToField = document.getElementById('compose-to');
        const composeSubject = document.getElementById('compose-subject');
        const composeBody = document.getElementById('compose-body');
        
        if (composeToField) {
            composeToField.addEventListener('focus', () => {
                if (!composeToField.value) {
                    this.announceToScreenReader('Recipient field. Say "start dictating" to use voice input.');
                }
            }, { once: true });
        }
        
        if (composeSubject) {
            composeSubject.addEventListener('focus', () => {
                if (!composeSubject.value) {
                    this.announceToScreenReader('Subject field. Say "start dictating" to use voice input.');
                }
            }, { once: true });
        }
        
        if (composeBody) {
            composeBody.addEventListener('focus', () => {
                if (!composeBody.value) {
                    this.announceToScreenReader('Message body field. Say "start dictating" to compose your email with voice.');
                }
            }, { once: true });
        }
    }

    showSettings() {
        this.showScreen('settings-screen');
        this.loadSettingsValues();
        this.speak('Settings opened. You can adjust accessibility preferences using voice commands or the controls.');
    }

    showHelp() {
        try {
            const helpModalElement = document.getElementById('help-modal');
            if (helpModalElement) {
                const helpModal = new bootstrap.Modal(helpModalElement);
                helpModal.show();
                // Automatically start voice tour when help is opened
                setTimeout(() => {
                    this.startVoiceTour();
                }, 500);
            } else {
                console.error('Help modal not found');
                this.speak('Help system is not available.');
            }
        } catch (error) {
            console.error('Show help error:', error);
            this.speak('Help system encountered an error.');
        }
    }

    async switchFolder(folder) {
        this.currentFolder = folder;
        this.updateFolderDisplay();
        
        // Map folder names to Gmail label IDs
        const labelMap = {
            'inbox': 'INBOX',
            'sent': 'SENT',
            'spam': 'SPAM',
            'drafts': 'DRAFT',
            'trash': 'TRASH'
        };
        
        const labelId = labelMap[folder];
        
        // Check if we already have emails for this folder
        const existingEmails = this.getEmailsByFolder(folder);
        
        if (existingEmails.length === 0 && labelId && folder !== 'inbox') {
            // Fetch emails for this folder if empty
            this.showLoadingOverlay(`Loading ${folder} emails...`);
            
            try {
                const authToken = localStorage.getItem('authToken');
                const response = await fetch(`${API_BASE_URL}/api/emails?labelIds=${labelId}&limit=50`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.emails) {
                        // Add these emails to our collection
                        const newEmails = data.emails.map((email, index) => ({
                            id: email.id || `${folder}-${index}`,
                            from: email.from || 'Unknown Sender',
                            to: email.to || '',
                            subject: email.subject || '(No Subject)',
                            timestamp: email.date || email.internalDate || new Date().toISOString(),
                            body: email.body || email.snippet || '',
                            htmlBody: email.htmlBody || '',
                            textBody: email.textBody || email.body || '',
                            attachments: email.attachments || [],
                            isRead: !email.isUnread,
                            priority: 'normal',
                            folder: folder,
                            hasAttachment: email.hasAttachments || false,
                            isSpam: folder === 'spam',
                            labelIds: email.labelIds || [labelId]
                        }));
                        
                        // Merge with existing emails
                        this.emails = this.emails.concat(newEmails);
                    }
                }
                this.hideLoadingOverlay();
            } catch (error) {
                console.error(`Error fetching ${folder} emails:`, error);
                this.hideLoadingOverlay();
            }
        }
        
        this.renderEmailList();
        
        const folderName = folder.charAt(0).toUpperCase() + folder.slice(1);
        const emailCount = this.getEmailsByFolder(folder).length;
        this.speak(`Switched to ${folderName}. ${emailCount} emails found.`);
    }

    updateFolderDisplay() {
        try {
            // Update folder navigation
            document.querySelectorAll('.folder-link').forEach(link => {
                link.classList.remove('active');
                link.setAttribute('aria-pressed', 'false');
            });

            const activeLink = document.querySelector(`[data-folder="${this.currentFolder}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
                activeLink.setAttribute('aria-pressed', 'true');
            }

            // Update folder title
            const currentFolderTitle = document.getElementById('current-folder-title');
            if (currentFolderTitle) {
                const folderTitle = this.currentFolder.charAt(0).toUpperCase() + this.currentFolder.slice(1);
                currentFolderTitle.textContent = folderTitle;
            }

            // Update counts
            this.updateEmailCounts();
        } catch (error) {
            console.error('Update folder display error:', error);
        }
    }

    updateEmailCounts() {
        try {
            const inboxCount = this.getEmailsByFolder('inbox').filter(email => !email.isRead).length;
            const spamCount = this.getEmailsByFolder('spam').length;
            
            const inboxCountElement = document.getElementById('inbox-count');
            if (inboxCountElement) {
                inboxCountElement.textContent = inboxCount;
            }
            
            const spamCountElement = document.getElementById('spam-count');
            if (spamCountElement) {
                spamCountElement.textContent = spamCount;
            }
        } catch (error) {
            console.error('Update email counts error:', error);
        }
    }

    renderEmailList() {
        try {
            const emailListElement = document.getElementById('email-list');
            if (!emailListElement) {
                console.error('Email list element not found');
                return;
            }
            
            const emails = this.getEmailsByFolder(this.currentFolder);
            
            emailListElement.innerHTML = '';

            emails.forEach((email, index) => {
                const emailElement = this.createEmailListItem(email, index);
                emailListElement.appendChild(emailElement);
            });

            if (emails.length === 0) {
                emailListElement.innerHTML = `
                    <div class="text-center p-4 text-muted">
                        <i class="fas fa-inbox fa-3x mb-3"></i>
                        <p>No emails in this folder</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Render email list error:', error);
        }
    }

    createEmailListItem(email, index) {
        const emailElement = document.createElement('div');
        emailElement.className = `email-item ${email.isRead ? '' : 'unread'} ${email.isSpam ? 'spam' : ''}`;
        emailElement.setAttribute('role', 'listitem');
        emailElement.setAttribute('tabindex', '0');
        emailElement.setAttribute('aria-label', this.getEmailAriaLabel(email));
        
        // Show 'To:' for sent and drafts, 'From:' for everything else
        const displayField = (email.folder === 'sent' || email.folder === 'drafts') 
            ? `To: ${email.to || email.from}` 
            : email.from;
        
        emailElement.innerHTML = `
            <div class="email-priority ${email.priority}"></div>
            <div class="email-content">
                <div class="email-from">${this.sanitizeHTML(displayField)}</div>
                <div class="email-subject">${this.sanitizeHTML(email.subject)}</div>
                <div class="email-preview">${this.sanitizeHTML(this.getEmailPreview(email.body))}</div>
            </div>
            <div class="email-meta">
                <div class="email-time">${this.formatTimestamp(email.timestamp)}</div>
                <div class="email-indicators">
                    ${!email.isRead ? '<span class="badge bg-primary">New</span>' : ''}
                    ${email.hasAttachment ? '<span class="badge bg-secondary"><i class="fas fa-paperclip"></i></span>' : ''}
                    ${email.isSpam ? '<span class="badge bg-danger">Spam</span>' : ''}
                    <span class="badge bg-${this.getPriorityColor(email.priority)}">${email.priority}</span>
                </div>
            </div>
        `;

        emailElement.addEventListener('click', () => {
            this.openEmail(email);
        });

        emailElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openEmail(email);
            }
        });

        return emailElement;
    }

    getEmailAriaLabel(email) {
        const status = email.isRead ? 'Read' : 'Unread';
        const spam = email.isSpam ? ', Spam' : '';
        const attachment = email.hasAttachment ? ', Has attachment' : '';
        const priority = email.priority;
        
        // Show 'To:' for sent and drafts, 'From:' for everything else
        const contactField = (email.folder === 'sent' || email.folder === 'drafts')
            ? `To: ${email.to || email.from}`
            : `From: ${email.from}`;
        
        return `${status} email${spam}${attachment}, Priority: ${priority}, ${contactField}, Subject: ${email.subject}, ${this.formatTimestamp(email.timestamp)}`;
    }

    getEmailPreview(body) {
        return body.replace(/\n/g, ' ').substring(0, 100) + (body.length > 100 ? '...' : '');
    }

    formatTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                return 'Today';
            } else if (diffDays === 2) {
                return 'Yesterday';
            } else if (diffDays < 7) {
                return `${diffDays - 1} days ago`;
            } else {
                return date.toLocaleDateString();
            }
        } catch (error) {
            return 'Unknown date';
        }
    }

    getPriorityColor(priority) {
        const colors = {
            'urgent': 'danger',
            'high': 'warning',
            'medium': 'info',
            'low': 'secondary'
        };
        return colors[priority] || 'secondary';
    }

    openEmail(email) {
        this.currentEmail = email;
        this.showScreen('reader-screen');
        
        // Mark as read locally
        const wasUnread = !email.isRead;
        email.isRead = true;
        this.updateEmailCounts();
        
        // Mark as read on the server (remove UNREAD label)
        if (wasUnread && email.id) {
            this.markEmailAsRead(email.id);
        }

        // Populate email reader
        const readerTitle = document.getElementById('reader-title');
        if (readerTitle) readerTitle.textContent = email.subject;
        
        const emailFrom = document.getElementById('email-from');
        if (emailFrom) {
            // Show 'To:' for sent/drafts, 'From:' for others
            const displayField = (email.folder === 'sent' || email.folder === 'drafts') 
                ? `To: ${email.to || email.from}` 
                : email.from;
            emailFrom.textContent = displayField;
        }
        
        const emailDate = document.getElementById('email-date');
        if (emailDate) emailDate.textContent = new Date(email.timestamp).toLocaleString();
        
        const emailBody = document.getElementById('email-body');
        if (emailBody) {
            // Clear previous content
            emailBody.innerHTML = '';
            
            // Debug logging
            console.log('Email htmlBody length:', email.htmlBody?.length);
            console.log('Email textBody length:', email.textBody?.length);
            console.log('Email body length:', email.body?.length);
            console.log('htmlBody preview:', email.htmlBody?.substring(0, 200));
            
            // Determine if we have HTML content (check for HTML tags)
            const hasHTMLContent = email.htmlBody && 
                                   email.htmlBody.trim() && 
                                   (email.htmlBody.includes('<') || email.htmlBody.length > (email.textBody?.length || 0));
            
            console.log('Has HTML content:', hasHTMLContent);
            
            // Display HTML content if available, otherwise plain text
            if (hasHTMLContent) {
                console.log('Rendering as HTML in iframe');
                // Create iframe for isolated HTML rendering
                const iframe = document.createElement('iframe');
                iframe.style.width = '100%';
                iframe.style.border = 'none';
                iframe.style.overflow = 'hidden';
                iframe.sandbox = 'allow-same-origin'; // Allow styling but block scripts
                
                emailBody.appendChild(iframe);
                
                // Write sanitized HTML to iframe
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const sanitizedHTML = this.sanitizeHTML(email.htmlBody, true);
                
                // Detect dark mode
                const isDarkMode = this.settings.darkMode;
                const bgColor = isDarkMode ? '#262828' : '#ffffff';
                const textColor = isDarkMode ? '#f5f5f5' : '#1f2121';
                const linkColor = isDarkMode ? '#32b8c6' : '#218089';
                
                iframeDoc.open();
                iframeDoc.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body {
                                margin: 0;
                                padding: 20px;
                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                                font-size: 14px;
                                line-height: 1.6;
                                color: ${textColor};
                                background: ${bgColor};
                                overflow-x: hidden;
                                word-wrap: break-word;
                            }
                            img {
                                max-width: 100%;
                                height: auto;
                            }
                            table {
                                max-width: 100%;
                                border-collapse: collapse;
                            }
                            a {
                                color: ${linkColor};
                                text-decoration: underline;
                            }
                            * {
                                max-width: 100%;
                            }
                        </style>
                    </head>
                    <body>${sanitizedHTML}</body>
                    </html>
                `);
                iframeDoc.close();
                
                // Auto-resize iframe to content height
                setTimeout(() => {
                    try {
                        const contentHeight = iframeDoc.body.scrollHeight;
                        iframe.style.height = contentHeight + 'px';
                        console.log('Iframe height set to:', contentHeight);
                    } catch (e) {
                        iframe.style.height = '600px';
                        console.error('Failed to get iframe height:', e);
                    }
                }, 100);
                
                // Re-adjust on window resize
                window.addEventListener('resize', () => {
                    try {
                        const contentHeight = iframeDoc.body.scrollHeight;
                        iframe.style.height = contentHeight + 'px';
                    } catch (e) {
                        // Ignore cross-origin errors
                    }
                });
            } else {
                console.log('Rendering as plain text');
                // Plain text email - use textBody if available, otherwise body
                emailBody.style.whiteSpace = 'pre-wrap';
                emailBody.style.padding = '20px';
                const textContent = email.textBody || email.body || '';
                
                // Convert URLs to clickable links
                const textWithLinks = this.linkifyText(textContent);
                emailBody.innerHTML = textWithLinks;
            }
        }

        // Show/hide attachments
        const attachmentDiv = document.getElementById('email-attachments');
        if (attachmentDiv) {
            if (email.hasAttachment && email.attachments && email.attachments.length > 0) {
                attachmentDiv.style.display = 'block';
                this.renderAttachments(email.attachments, email.id);
            } else {
                attachmentDiv.style.display = 'none';
            }
        }

        // Auto-read if enabled
        if (this.settings.autoReadEmails) {
            setTimeout(() => {
                this.readCurrentEmail();
            }, 1000);
        } else {
            const fromText = (email.folder === 'sent' || email.folder === 'drafts') 
                ? `to ${email.to}` 
                : `from ${email.from}`;
            this.speak(`Email opened: ${email.subject} ${fromText}. Say "read email" to have it read aloud.`);
        }
    }

    readAllEmails() {
        const currentFolderEmails = this.emails.filter(email => email.folder === this.currentFolder);
        
        if (currentFolderEmails.length === 0) {
            this.speak(`No emails in ${this.currentFolder}.`);
            return;
        }

        let emailSummary = `You have ${currentFolderEmails.length} emails in ${this.currentFolder}. `;
        
        currentFolderEmails.slice(0, 5).forEach((email, index) => {
            const fromText = (email.folder === 'sent' || email.folder === 'drafts') 
                ? `to ${email.to}` 
                : `from ${email.from}`;
            emailSummary += `Email ${index + 1}: ${fromText}. Subject: ${email.subject}. `;
        });

        if (currentFolderEmails.length > 5) {
            emailSummary += `And ${currentFolderEmails.length - 5} more emails. `;
        }

        emailSummary += `Say "open email" followed by a number to open a specific email.`;
        
        this.speak(emailSummary);
    }

    readCurrentEmail() {
        if (!this.currentEmail) return;

        // Debug logging
        console.log('Reading email:', this.currentEmail);
        console.log('htmlBody length:', this.currentEmail.htmlBody?.length);
        console.log('textBody length:', this.currentEmail.textBody?.length);
        console.log('body length:', this.currentEmail.body?.length);

        // Extract plain text from HTML for voice reading
        let messageContent = '';
        
        // Check if textBody contains CSS/code patterns (not actual readable content)
        const textBodyHasCSS = this.currentEmail.textBody && (
            this.currentEmail.textBody.includes('@media') ||
            this.currentEmail.textBody.includes('{') ||
            this.currentEmail.textBody.includes('!important') ||
            this.currentEmail.textBody.includes('padding:') ||
            this.currentEmail.textBody.includes('margin:') ||
            this.currentEmail.textBody.includes('width:') ||
            this.currentEmail.textBody.includes('font-size:') ||
            this.currentEmail.textBody.includes('<!DOCTYPE') ||
            this.currentEmail.textBody.includes('<html') ||
            this.currentEmail.textBody.includes('box-sizing')
        );
        
        // Check if any field contains HTML
        const bodyIsHTML = this.currentEmail.body && 
                          (this.currentEmail.body.trim().startsWith('<') || 
                           this.currentEmail.body.includes('<!DOCTYPE'));
        const htmlBodyHasContent = this.currentEmail.htmlBody && 
                                   this.currentEmail.htmlBody.trim().length > 0;
        
        // Always prefer converting HTML to get clean text
        if (htmlBodyHasContent) {
            console.log('Using htmlBody, converting to plain text');
            messageContent = this.htmlToPlainText(this.currentEmail.htmlBody);
        } else if (bodyIsHTML) {
            console.log('Body field contains HTML, converting to plain text');
            messageContent = this.htmlToPlainText(this.currentEmail.body);
        } else if (this.currentEmail.textBody && !textBodyHasCSS) {
            console.log('Using textBody (no CSS detected)');
            messageContent = this.currentEmail.textBody;
        } else if (this.currentEmail.textBody) {
            // textBody has CSS, try to clean it
            console.log('textBody has CSS, cleaning it');
            messageContent = this.htmlToPlainText(this.currentEmail.textBody);
        } else {
            console.log('Using body as fallback');
            messageContent = this.currentEmail.body || 'No content available';
        }
        
        // If extracted content is too short, add a note
        if (messageContent.trim().length < 50) {
            messageContent = messageContent + '\n\nNote: This email contains mostly images or formatting. The readable text content is limited.';
        }

        console.log('Final message content length:', messageContent.length);
        console.log('Final message content preview:', messageContent.substring(0, 300));

        const emailContent = `
            Email from ${this.currentEmail.from}.
            Subject: ${this.currentEmail.subject}.
            Received on ${new Date(this.currentEmail.timestamp).toLocaleDateString()}.
            
            Message content:
            ${messageContent}
        `;

        this.speak(emailContent);
        
        // Update reading controls
        const readEmailBtn = document.getElementById('read-email-btn');
        const pauseReadingBtn = document.getElementById('pause-reading-btn');
        const stopReadingBtn = document.getElementById('stop-reading-btn');
        
        if (readEmailBtn) readEmailBtn.style.display = 'none';
        if (pauseReadingBtn) pauseReadingBtn.style.display = 'inline-block';
        if (stopReadingBtn) stopReadingBtn.style.display = 'inline-block';
    }

    pauseReading() {
        if (this.synthesis) {
            this.synthesis.pause();
            const pauseBtn = document.getElementById('pause-reading-btn');
            if (pauseBtn) {
                pauseBtn.textContent = 'Resume Reading';
                pauseBtn.onclick = () => this.resumeReading();
            }
        }
    }

    resumeReading() {
        if (this.synthesis) {
            this.synthesis.resume();
            const pauseBtn = document.getElementById('pause-reading-btn');
            if (pauseBtn) {
                pauseBtn.textContent = 'Pause Reading';
                pauseBtn.onclick = () => this.pauseReading();
            }
        }
    }

    stopReading() {
        if (this.synthesis) {
            this.synthesis.cancel();
        }
        this.isReading = false;
        
        // Reset reading controls
        const readEmailBtn = document.getElementById('read-email-btn');
        const pauseReadingBtn = document.getElementById('pause-reading-btn');
        const stopReadingBtn = document.getElementById('stop-reading-btn');
        
        if (readEmailBtn) readEmailBtn.style.display = 'inline-block';
        if (pauseReadingBtn) pauseReadingBtn.style.display = 'none';
        if (stopReadingBtn) stopReadingBtn.style.display = 'none';
    }

    replyToEmail() {
        if (!this.currentEmail) return;

        this.showCompose();
        
        // Pre-fill reply fields
        const composeTo = document.getElementById('compose-to');
        const composeSubject = document.getElementById('compose-subject');
        const composeBody = document.getElementById('compose-body');
        
        if (composeTo) composeTo.value = this.currentEmail.from;
        if (composeSubject) composeSubject.value = `Re: ${this.currentEmail.subject}`;
        if (composeBody) composeBody.value = `\n\nOriginal message:\n${this.currentEmail.body}`;
        
        this.speak('Reply composition started. The recipient and subject have been filled in.');
    }

    forwardEmail() {
        if (!this.currentEmail) return;

        this.showCompose();
        
        // Pre-fill forward fields
        const composeSubject = document.getElementById('compose-subject');
        const composeBody = document.getElementById('compose-body');
        
        if (composeSubject) composeSubject.value = `Fwd: ${this.currentEmail.subject}`;
        if (composeBody) composeBody.value = `\n\nForwarded message:\nFrom: ${this.currentEmail.from}\nSubject: ${this.currentEmail.subject}\n\n${this.currentEmail.body}`;
        
        this.speak('Forward composition started. Enter the recipient and add your message.');
        
        // Focus on the 'To' field
        setTimeout(() => {
            const composeTo = document.getElementById('compose-to');
            if (composeTo) composeTo.focus();
        }, 100);
    }

    async deleteCurrentEmail() {
        if (!this.currentEmail) return;

        this.showLoadingOverlay('Deleting email...');
        
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/api/emails/${this.currentEmail.id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete email');
            }

            // Remove from emails array
            const index = this.emails.findIndex(email => email.id === this.currentEmail.id);
            if (index !== -1) {
                this.emails.splice(index, 1);
            }

            this.hideLoadingOverlay();
            this.speak('Email deleted.');
            this.showToast('Email deleted', 'success');
            this.navigateToInbox();
        } catch (error) {
            console.error('Delete email error:', error);
            this.hideLoadingOverlay();
            this.speak('Failed to delete email.');
            this.showToast('Failed to delete email', 'error');
        }
    }

    markAsSpam() {
        if (!this.currentEmail) return;

        // Move to spam folder
        this.currentEmail.folder = 'spam';
        this.currentEmail.isSpam = true;

        this.speak('Email marked as spam and moved to spam folder.');
        this.showToast('Email marked as spam', 'success');
        this.navigateToInbox();
    }

    async sendEmail() {
        const composeTo = document.getElementById('compose-to');
        const composeSubject = document.getElementById('compose-subject');
        const composeBody = document.getElementById('compose-body');
        
        const to = composeTo ? composeTo.value.trim() : '';
        const subject = composeSubject ? composeSubject.value.trim() : '';
        const body = composeBody ? composeBody.value.trim() : '';

        // Debug logging
        console.log('Sending email with:');
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('Body:', body);
        console.log('Body length:', body.length);

        if (!to || !subject || !body) {
            this.speak('Please fill in all required fields: recipient, subject, and message.');
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        if (!this.isValidEmail(to)) {
            this.speak('Please enter a valid email address.');
            this.showToast('Please enter a valid email address', 'error');
            return;
        }

        this.showLoadingOverlay('Sending email...');

        try {
            const authToken = localStorage.getItem('authToken');
            const requestBody = {
                to,
                subject,
                body
            };
            console.log('Request body:', JSON.stringify(requestBody));
            
            const response = await fetch(`${API_BASE_URL}/api/emails/send`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            console.log('Response:', data);

            if (!response.ok) {
                throw new Error(data.message || 'Failed to send email');
            }

            this.hideLoadingOverlay();
            this.speak('Email sent successfully.');
            this.showToast('Email sent successfully', 'success');
            this.clearComposeForm();
            this.navigateToInbox();
            
            // Restart voice recognition after navigation
            setTimeout(() => {
                if (!this.isListening && this.voiceSupported) {
                    this.startVoiceRecognition();
                }
            }, 1000);
        } catch (error) {
            console.error('Send email error:', error);
            this.hideLoadingOverlay();
            this.speak('Failed to send email. Please try again.');
            this.showToast('Failed to send email', 'error');
        }
    }

    confirmAndSaveDraft() {
        try {
            const to = document.getElementById('compose-to')?.value.trim();
            const subject = document.getElementById('compose-subject')?.value.trim();
            const body = document.getElementById('compose-body')?.value.trim();
            
            if (!to && !subject && !body) {
                this.speak('No content to save as draft.');
                this.showToast('No content to save', 'warning');
                return;
            }
            
            // Read back the draft content for confirmation
            const draftSummary = `Ready to save draft. ${to ? 'Recipient: ' + to + '. ' : ''}${subject ? 'Subject: ' + subject + '. ' : ''}${body ? 'Message: ' + body.substring(0, 50) + (body.length > 50 ? '... and more. ' : '. ') : ''}Say "confirm save" to save, or "cancel" to go back.`;
            this.speak(draftSummary);
            this.showToast('Confirm to save draft', 'info');
        } catch (error) {
            console.error('Draft confirmation error:', error);
            this.speak('Unable to confirm draft.');
        }
    }
    
    confirmLargerText() {
        const currentSize = this.settings.fontSize;
        this.speak(`Current text size is ${currentSize} pixels. Say "confirm larger text" to increase, or "cancel" to keep current size.`);
        this.showToast('Confirm text size increase', 'info');
    }

    saveDraft() {
        const composeTo = document.getElementById('compose-to');
        const composeSubject = document.getElementById('compose-subject');
        const composeBody = document.getElementById('compose-body');
        
        const to = composeTo ? composeTo.value : '';
        const subject = composeSubject ? composeSubject.value : '';
        const body = composeBody ? composeBody.value : '';

        if (!to && !subject && !body) {
            this.speak('No content to save as draft.');
            return;
        }

        // Add to drafts (simulated)
        this.speak('Email saved as draft.');
        this.showToast('Draft saved', 'success');
    }

    clearComposeForm() {
        const composeTo = document.getElementById('compose-to');
        const composeSubject = document.getElementById('compose-subject');
        const composeBody = document.getElementById('compose-body');
        
        if (composeTo) composeTo.value = '';
        if (composeSubject) composeSubject.value = '';
        if (composeBody) composeBody.value = '';
    }

    cancelCompose() {
        this.speak('Email composition cancelled.');
        this.clearComposeForm();
        this.navigateBack();
    }

    cancelCurrentAction() {
        // Cancel any pending commands
        if (this.pendingCommand) {
            this.speak('Command cancelled.');
            this.showToast('Cancelled', 'info');
            this.pendingCommand = null;
            return;
        }
        
        // If dictating, stop dictation
        if (this.isDictating) {
            this.stopDictation();
            return;
        }
        
        // If on compose screen, cancel composition
        if (this.currentScreen === 'compose-screen') {
            this.cancelCompose();
            return;
        }
        
        // Otherwise, go back
        this.navigateBack();
    }

    openSearch() {
        const searchTerm = prompt('Enter search term (or use voice commands):');
        if (searchTerm) {
            this.searchEmails(searchTerm);
        }
    }

    searchEmails(term) {
        const results = this.emails.filter(email => 
            email.subject.toLowerCase().includes(term.toLowerCase()) ||
            email.body.toLowerCase().includes(term.toLowerCase()) ||
            email.from.toLowerCase().includes(term.toLowerCase())
        );

        this.speak(`Found ${results.length} emails matching "${term}".`);
        this.showToast(`Found ${results.length} results`, 'info');
        
        // You could implement a search results view here
    }

    refreshEmails() {
        this.showLoadingOverlay('Refreshing emails...');
        
        setTimeout(() => {
            this.hideLoadingOverlay();
            this.renderEmailList();
            this.speak('Emails refreshed.');
            this.showToast('Emails refreshed', 'success');
        }, 1500);
    }

    // Navigation helpers
    navigateBack() {
        switch (this.currentScreen) {
            case 'compose-screen':
            case 'reader-screen':
            case 'settings-screen':
                this.navigateToInbox();
                break;
            default:
                this.showScreen('login-screen');
        }
    }

    logout() {
        try {
            // Stop any ongoing voice activities
            this.stopReading();
            if (this.recognition) {
                this.recognition.stop();
            }
            
            // Clear auth token
            localStorage.removeItem('authToken');
            
            // Show feedback
            this.speak('Logged out successfully. Goodbye!');
            this.showToast('Logged out successfully', 'success');
            
            // Return to login screen
            setTimeout(() => {
                this.showScreen('login-screen');
            }, 500);
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('Error during logout', 'error');
        }
    }

    // Voice command implementations
    repeatLastSpoken() {
        if (this.lastSpokenText) {
            this.speak(this.lastSpokenText);
        } else {
            this.speak('Nothing to repeat.');
        }
    }

    increaseVolume() {
        this.settings.speechVolume = Math.min(1.0, this.settings.speechVolume + 0.1);
        const volumeSlider = document.getElementById('speech-volume');
        const volumeValue = document.getElementById('speech-volume-value');
        
        if (volumeSlider) volumeSlider.value = this.settings.speechVolume;
        if (volumeValue) volumeValue.textContent = `${Math.round(this.settings.speechVolume * 100)}%`;
        
        this.speak('Volume increased.');
    }

    decreaseVolume() {
        this.settings.speechVolume = Math.max(0.1, this.settings.speechVolume - 0.1);
        const volumeSlider = document.getElementById('speech-volume');
        const volumeValue = document.getElementById('speech-volume-value');
        
        if (volumeSlider) volumeSlider.value = this.settings.speechVolume;
        if (volumeValue) volumeValue.textContent = `${Math.round(this.settings.speechVolume * 100)}%`;
        
        this.speak('Volume decreased.');
    }

    toggleContrast(force = null) {
        const shouldEnable = force !== null ? force : !this.settings.highContrast;
        this.settings.highContrast = shouldEnable;
        
        // Set on both html and body for CSS compatibility
        document.documentElement.setAttribute('data-high-contrast', shouldEnable);
        document.body.setAttribute('data-high-contrast', shouldEnable);
        
        const highContrastToggle = document.getElementById('high-contrast');
        if (highContrastToggle) {
            highContrastToggle.checked = shouldEnable;
        }
        
        this.speak(shouldEnable ? 'High contrast mode enabled.' : 'High contrast mode disabled.');
    }

    increaseFontSize() {
        this.settings.fontSize = Math.min(24, this.settings.fontSize + 2);
        const fontSizeSlider = document.getElementById('font-size');
        const fontSizeValue = document.getElementById('font-size-value');
        
        if (fontSizeSlider) fontSizeSlider.value = this.settings.fontSize;
        if (fontSizeValue) fontSizeValue.textContent = `${this.settings.fontSize}px`;
        
        document.body.style.fontSize = `${this.settings.fontSize}px`;
        this.speak('Font size increased.');
    }

    // Settings management
    loadSettings() {
        try {
            const saved = localStorage.getItem('voiceEmailSettings');
            if (saved) {
                Object.assign(this.settings, JSON.parse(saved));
            }
            // Always apply settings (including theme) on load
            this.applySettings();
        } catch (error) {
            console.error('Load settings error:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('voiceEmailSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Save settings error:', error);
        }
    }

    loadSettingsValues() {
        try {
            const fontSizeSlider = document.getElementById('font-size');
            const fontSizeValue = document.getElementById('font-size-value');
            if (fontSizeSlider) fontSizeSlider.value = this.settings.fontSize;
            if (fontSizeValue) fontSizeValue.textContent = `${this.settings.fontSize}px`;
            
            const speechRateSlider = document.getElementById('speech-rate');
            const speechRateValue = document.getElementById('speech-rate-value');
            if (speechRateSlider) speechRateSlider.value = this.settings.speechRate;
            if (speechRateValue) {
                const speedText = this.settings.speechRate < 1 ? 'Slow' : this.settings.speechRate > 1 ? 'Fast' : 'Normal';
                speechRateValue.textContent = `${this.settings.speechRate}x (${speedText})`;
            }
            
            const speechVolumeSlider = document.getElementById('speech-volume');
            const speechVolumeValue = document.getElementById('speech-volume-value');
            if (speechVolumeSlider) speechVolumeSlider.value = this.settings.speechVolume;
            if (speechVolumeValue) speechVolumeValue.textContent = `${Math.round(this.settings.speechVolume * 100)}%`;
            
            const highContrastToggle = document.getElementById('high-contrast');
            if (highContrastToggle) highContrastToggle.checked = this.settings.highContrast;
            
            const voiceLanguageSelect = document.getElementById('voice-language');
            if (voiceLanguageSelect) voiceLanguageSelect.value = this.settings.voiceLanguage;
            
            const autoReadToggle = document.getElementById('auto-read');
            if (autoReadToggle) autoReadToggle.checked = this.settings.autoReadEmails;
            
            const confirmActionsToggle = document.getElementById('confirm-actions');
            if (confirmActionsToggle) confirmActionsToggle.checked = this.settings.confirmActions;
        } catch (error) {
            console.error('Load settings values error:', error);
        }
    }

    applySettings() {
        try {
            document.body.style.fontSize = `${this.settings.fontSize}px`;
            this.toggleContrast(this.settings.highContrast);
            this.applyTheme();
            
            if (this.recognition) {
                this.recognition.lang = this.settings.voiceLanguage;
            }
            this.updateVoiceSelection();
        } catch (error) {
            console.error('Apply settings error:', error);
        }
    }

    resetSettings() {
        this.settings = {
            fontSize: 16,
            speechRate: 1.0,
            speechVolume: 0.8,
            highContrast: false,
            darkMode: this.getPreferredTheme(),
            voiceLanguage: 'en-US',
            autoReadEmails: true,
            confirmActions: true
        };
        
        this.loadSettingsValues();
        this.applySettings();
        this.speak('Settings reset to default values.');
        this.showToast('Settings reset', 'success');
    }

    startVoiceTour() {
        const tourSteps = [
            'Welcome to the voice tour. I will guide you through all the voice commands.',
            
            // Navigation commands
            'Navigation commands: Say "read inbox" or "read all emails" to hear your email list.',
            'Say "go back" to return to the previous screen.',
            'Say "search emails" to search your mailbox.',
            
            // Email actions
            'Email actions: When viewing an email, say "read email" to have it read aloud.',
            'Say "reply" to reply to the current email.',
            'Say "forward" to forward the email.',
            'Say "delete" to delete the email.',
            'Say "mark as spam" to mark it as spam.',
            
            // Composing emails
            'Composing emails: Say "compose email" to write a new message.',
            'Say "start dictating" to use voice input for text fields.',
            'Say "dictate recipient", "dictate subject", or "dictate message" to fill specific fields.',
            'Say "stop dictating" when done with voice input.',
            'Say "send email" to review and send your message.',
            'Say "confirm send" to confirm sending.',
            'Say "save draft" and "confirm save" to save as draft.',
            'Say "cancel message" to discard your email.',
            
            // Settings and accessibility
            'Settings and accessibility: Say "show settings" to open preferences.',
            'Say "louder" or "quieter" to adjust voice volume.',
            'Say "larger text" to increase font size.',
            'Say "high contrast" or "toggle contrast" for better visibility.',
            
            // General commands
            'General commands: Say "help" anytime to hear this guide.',
            'Say "repeat" to hear the last spoken message again.',
            'Say "cancel" to cancel the current action.',
            'Say "sign in" or "login" when on the login screen.',
            
            'Voice tour complete. You can now use these commands to navigate the email system. Enjoy!'
        ];

        let currentStep = 0;
        
        const speakNextStep = () => {
            if (currentStep < tourSteps.length) {
                this.speak(tourSteps[currentStep]);
                currentStep++;
                setTimeout(speakNextStep, 5000); // Wait 5 seconds between steps
            } else {
                // Close help modal
                try {
                    const helpModalElement = document.getElementById('help-modal');
                    if (helpModalElement) {
                        const helpModal = bootstrap.Modal.getInstance(helpModalElement);
                        if (helpModal) {
                            helpModal.hide();
                        }
                    }
                } catch (error) {
                    console.error('Close help modal error:', error);
                }
            }
        };

        speakNextStep();
    }

    // Utility functions
    async markEmailAsRead(emailId) {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/api/emails/${emailId}/labels`, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    removeLabelIds: ['UNREAD']
                })
            });

            if (!response.ok) {
                console.error('Failed to mark email as read on server');
            } else {
                console.log('Email marked as read on server');
            }
        } catch (error) {
            console.error('Error marking email as read:', error);
        }
    }

    getEmailsByFolder(folder) {
        return this.emails.filter(email => email.folder === folder);
    }

    getUnreadCount() {
        return this.emails.filter(email => !email.isRead && email.folder === 'inbox').length;
    }

    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    htmlToPlainText(html) {
        if (!html) return '';
        
        try {
            // First, remove CSS content that might be in the HTML
            // Remove inline style blocks
            let cleanedHtml = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            // Remove script blocks
            cleanedHtml = cleanedHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
            // Remove HTML comments
            cleanedHtml = cleanedHtml.replace(/<!--[\s\S]*?-->/g, '');
            // Remove CSS class definitions that might leak through
            cleanedHtml = cleanedHtml.replace(/\{[^}]*\}/g, ' ');
            
            // Create a temporary div to parse HTML
            const temp = document.createElement('div');
            temp.innerHTML = cleanedHtml;
            
            // Remove remaining script, style, and other non-content elements
            temp.querySelectorAll('script, style, noscript, head, meta, link, title, svg, defs').forEach(el => el.remove());
            
            // Replace <br> with line breaks
            temp.querySelectorAll('br').forEach(br => {
                br.replaceWith(document.createTextNode('\n'));
            });
            
            // Replace block elements with their text + line break
            temp.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, tr, td').forEach(el => {
                const content = el.textContent;
                if (content && content.trim()) {
                    el.replaceWith(document.createTextNode(content.trim() + '\n'));
                }
            });
            
            // Get text content
            let text = temp.textContent || temp.innerText || '';
            
            // Remove CSS-like patterns that might remain
            text = text.replace(/[.#][\w-]+\s*\{[^}]*\}/g, ''); // CSS rules
            text = text.replace(/\{[^}]*\}/g, ''); // Any remaining braces content
            text = text.replace(/@[\w-]+[^;]*;/g, ''); // @media, @import, etc.
            text = text.replace(/!important/gi, ''); // !important declarations
            text = text.replace(/\b\d+px\b/g, ''); // pixel values
            text = text.replace(/\b(margin|padding|font-size|color|background|border|width|height|display|position)\s*:/gi, ''); // CSS properties
            
            // Clean up excessive whitespace
            text = text.replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
                       .replace(/\n\s*\n\s*\n+/g, '\n\n') // Max 2 consecutive newlines
                       .replace(/\n +/g, '\n') // Remove leading spaces after newlines
                       .trim();
            
            // Decode HTML entities
            const textarea = document.createElement('textarea');
            textarea.innerHTML = text;
            text = textarea.value;
            
            // Final cleanup - remove any remaining garbage
            text = text.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width chars
            text = text.replace(/&[a-z]+;/gi, ' '); // Remaining HTML entities
            text = text.replace(/&#\d+;/g, ' '); // Numeric HTML entities
            
            console.log('Final cleaned text length:', text.length);
            console.log('Final cleaned text preview:', text.substring(0, 300));
            
            return text;
        } catch (error) {
            console.error('HTML to text conversion error:', error);
            // Fallback: aggressive tag and CSS stripping
            let fallbackText = html
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<[^>]*>/g, ' ')
                .replace(/\{[^}]*\}/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            return fallbackText;
        }
    }

    linkifyText(text) {
        if (!text) return '';
        
        // Escape HTML first
        const div = document.createElement('div');
        div.textContent = text;
        let escapedText = div.innerHTML;
        
        // URL regex pattern - matches http, https, and www URLs
        const urlPattern = /(\b(https?:\/\/|www\.)[^\s<>]+[^\s<>.,;:!?'")\]])/gi;
        
        // Email pattern
        const emailPattern = /\b([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})\b/gi;
        
        // Replace URLs with clickable links
        escapedText = escapedText.replace(urlPattern, (url) => {
            let href = url;
            if (!url.startsWith('http')) {
                href = 'http://' + url;
            }
            return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: var(--color-primary); text-decoration: underline;">${url}</a>`;
        });
        
        // Replace email addresses with mailto links
        escapedText = escapedText.replace(emailPattern, (email) => {
            return `<a href="mailto:${email}" style="color: var(--color-primary); text-decoration: underline;">${email}</a>`;
        });
        
        return escapedText;
    }

    sanitizeHTML(text, allowHTML = false) {
        if (!allowHTML) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // For HTML emails, sanitize dangerous content while preserving layout
        const div = document.createElement('div');
        div.innerHTML = text;
        
        // Remove script tags
        const scripts = div.querySelectorAll('script');
        scripts.forEach(script => script.remove());
        
        // Remove style tags that might break the layout (keep inline styles)
        const styles = div.querySelectorAll('style');
        styles.forEach(style => {
            // Keep media queries and basic styles, remove dangerous ones
            const content = style.textContent || '';
            if (content.includes('javascript:') || content.includes('expression(')) {
                style.remove();
            }
        });
        
        // Remove forms and inputs
        const forms = div.querySelectorAll('form, input, textarea, button');
        forms.forEach(el => el.remove());
        
        // Remove event handler attributes and dangerous attributes
        const allElements = div.querySelectorAll('*');
        allElements.forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                const attrName = attr.name.toLowerCase();
                
                // Remove event handlers
                if (attrName.startsWith('on')) {
                    el.removeAttribute(attr.name);
                }
                
                // Remove javascript: hrefs
                if (attrName === 'href' || attrName === 'src') {
                    const value = attr.value.toLowerCase();
                    if (value.startsWith('javascript:') || value.startsWith('data:text/html')) {
                        el.removeAttribute(attr.name);
                    }
                }
                
                // Remove dangerous protocols
                if (attrName === 'action' || attrName === 'formaction') {
                    el.removeAttribute(attr.name);
                }
            });
            
            // Make links open in new tab and add security
            if (el.tagName === 'A') {
                el.setAttribute('target', '_blank');
                el.setAttribute('rel', 'noopener noreferrer');
            }
            
            // Ensure images don't break layout
            if (el.tagName === 'IMG') {
                el.style.maxWidth = '100%';
                el.style.height = 'auto';
            }
            
            // Limit table widths
            if (el.tagName === 'TABLE') {
                if (!el.style.width || parseInt(el.style.width) > 100) {
                    el.style.width = '100%';
                }
                el.style.maxWidth = '100%';
            }
        });
        
        return div.innerHTML;
    }

    renderAttachments(attachments, emailId) {
        const attachmentDiv = document.getElementById('email-attachments');
        if (!attachmentDiv || !attachments || attachments.length === 0) return;
        
        const attachmentList = attachments.map(attachment => {
            const sizeKB = Math.round(attachment.size / 1024);
            const sizeDisplay = sizeKB > 1024 
                ? `${Math.round(sizeKB / 1024 * 10) / 10} MB` 
                : `${sizeKB} KB`;
            
            return `
                <div class="attachment-item" style="display: inline-block; margin: 5px;">
                    <button class="btn btn-sm btn--outline" 
                            onclick="window.voiceEmailApp.downloadAttachment('${emailId}', '${attachment.attachmentId}', '${this.sanitizeHTML(attachment.filename)}')"
                            aria-label="Download ${this.sanitizeHTML(attachment.filename)}">
                        <i class="fas fa-paperclip me-1" aria-hidden="true"></i>
                        ${this.sanitizeHTML(attachment.filename)}
                        <span class="badge bg-secondary ms-1">${sizeDisplay}</span>
                    </button>
                </div>
            `;
        }).join('');
        
        attachmentDiv.innerHTML = `
            <strong>Attachments (${attachments.length}):</strong>
            <div class="attachments-list mt-2">
                ${attachmentList}
            </div>
        `;
    }

    async downloadAttachment(messageId, attachmentId, filename) {
        try {
            this.showLoadingOverlay('Downloading attachment...');
            
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/api/emails/${messageId}/attachments/${attachmentId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to download attachment');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            this.hideLoadingOverlay();
            this.speak(`Downloaded ${filename}`);
            this.showToast(`Downloaded ${filename}`, 'success');
        } catch (error) {
            console.error('Download attachment error:', error);
            this.hideLoadingOverlay();
            this.speak('Failed to download attachment');
            this.showToast('Failed to download attachment', 'error');
        }
    }

    showToast(message, type = 'info') {
        try {
            const toastContainer = document.getElementById('toast-container');
            if (!toastContainer) return;
            
            const toastId = 'toast-' + Date.now();
            
            const toastHTML = `
                <div id="${toastId}" class="toast toast-${type}" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="toast-body">
                        ${this.sanitizeHTML(message)}
                    </div>
                </div>
            `;
            
            toastContainer.insertAdjacentHTML('beforeend', toastHTML);
            
            const toastElement = document.getElementById(toastId);
            if (toastElement && window.bootstrap) {
                const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
                toast.show();
                
                toastElement.addEventListener('hidden.bs.toast', () => {
                    toastElement.remove();
                });
            }
        } catch (error) {
            console.error('Show toast error:', error);
        }
    }

    showLoadingOverlay(message) {
        try {
            const loadingText = document.getElementById('loading-text');
            const loadingOverlay = document.getElementById('loading-overlay');
            
            if (loadingText) loadingText.textContent = message;
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
        } catch (error) {
            console.error('Show loading overlay error:', error);
        }
    }

    hideLoadingOverlay() {
        try {
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        } catch (error) {
            console.error('Hide loading overlay error:', error);
        }
    }

    handleKeyboardNavigation(e) {
        try {
            // Implement keyboard shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        this.showCompose();
                        break;
                    case 'r':
                        e.preventDefault();
                        if (this.currentEmail) {
                            this.replyToEmail();
                        }
                        break;
                    case '/':
                        e.preventDefault();
                        this.openSearch();
                        break;
                    case 'd':
                        e.preventDefault();
                        this.toggleDarkMode();
                        break;
                }
            }
            
            // Escape key handling
            if (e.key === 'Escape') {
                if (this.isDictating) {
                    this.stopDictation();
                } else {
                    this.navigateBack();
                }
            }
        } catch (error) {
            console.error('Keyboard navigation error:', error);
        }
    }

    // Theme Management Methods
    getPreferredTheme() {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
            return storedTheme === 'dark';
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    toggleDarkMode() {
        this.settings.darkMode = !this.settings.darkMode;
        this.applyTheme();
        this.saveSettings();
        const mode = this.settings.darkMode ? 'dark' : 'light';
        this.speak(`Switched to ${mode} mode`);
        this.announceToScreenReader(`Theme changed to ${mode} mode`);
    }

    applyTheme() {
        const theme = this.settings.darkMode ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-color-scheme', theme);
        localStorage.setItem('theme', theme);
        
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            themeIcon.className = this.settings.darkMode ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    // Screen Reader Announcements
    announceToScreenReader(message) {
        const srRegion = document.getElementById('sr-announcements');
        if (srRegion) {
            srRegion.textContent = message;
            setTimeout(() => {
                srRegion.textContent = '';
            }, 1000);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Initializing Voice Email App');
        window.voiceEmailApp = new VoiceEmailApp();
        window.voiceEmailApp.init();
    } catch (error) {
        console.error('Application initialization failed:', error);
    }
});