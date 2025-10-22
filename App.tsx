import React, { useState, useCallback, useEffect, useRef } from 'react';
import { LANGUAGES } from './constants';
import { ImageUploader } from './components/ImageUploader';
import { ResultDisplay } from './components/ResultDisplay';
import { WeatherDisplay } from './components/WeatherDisplay';
import { fetchLocationData, generateCropAdvice, generatePhotoAnalysis } from './services/geminiService';
import { useVoiceInteraction } from './hooks/useVoiceInteraction';
import { useTranslations } from './hooks/useTranslations';
import Spinner from './components/Spinner';
import { WeatherData } from './types';

const App: React.FC = () => {
    const [language, setLanguage] = useState('en');
    const { t } = useTranslations(language);
    const [locationText, setLocationText] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // State for the new crop recommendation feature
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [isFetchingWeather, setIsFetchingWeather] = useState(false);
    const [soilCondition, setSoilCondition] = useState<'good' | 'low'>('good');
    
    const debounceTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        if (locationText.trim().length > 3) { // Fetch only if location is reasonably long
            setIsFetchingWeather(true);
            setWeatherData(null);
            debounceTimeoutRef.current = window.setTimeout(async () => {
                try {
                    const data = await fetchLocationData(locationText);
                    setWeatherData(data);
                } catch (error) {
                    console.error(error);
                    // Optionally show an error to the user
                } finally {
                    setIsFetchingWeather(false);
                }
            }, 1500); // 1.5-second debounce delay
        } else {
            setWeatherData(null);
            setIsFetchingWeather(false);
        }
    }, [locationText]);


    const handleFinalVoiceResponse = useCallback((aiResponse: string) => {
        setResult(aiResponse);
        setIsLoading(false);
    }, []);
    
    const { isSessionActive, isConnecting, startSession, stopSession, error: voiceError } = useVoiceInteraction(handleFinalVoiceResponse);

    const handleToggleVoice = () => {
        if (isSessionActive) {
            stopSession();
        } else {
            setResult(null);
            setIsLoading(true);
            startSession(language, locationText);
        }
    };
    
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleImageAnalysis = async () => {
        if (!imageFile) return;
        setResult(null);
        setIsLoading(true);
        try {
            const imageBase64 = await fileToBase64(imageFile);
            const response = await generatePhotoAnalysis(imageBase64, language, locationText);
            setResult(response);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : t('unknownError');
            setResult(`${t('photoError')} \n${t('details')}: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGetCropAdvice = async () => {
        if (!weatherData) return;
        setResult(null);
        setIsLoading(true);
        try {
            const response = await generateCropAdvice(language, locationText, weatherData, soilCondition);
            setResult(response);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : t('unknownError');
            setResult(`${t('adviceError')} \n${t('details')}: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div 
            className="relative min-h-screen flex items-center justify-center p-4 font-sans"
            style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1974&auto=format&fit=crop')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
            }}
        >
            <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/80 z-0" />
            <main className="relative z-10 w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 md:p-8 space-y-6">
                
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('appTitle')}</h1>
                    <p className="text-md text-gray-600 dark:text-gray-400">{t('appSubtitle')}</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('selectLanguage')}</label>
                        <select
                            id="language-select"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                        >
                            {LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="location-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('enterLocation')}</label>
                         <input
                            type="text"
                            id="location-input"
                            value={locationText}
                            onChange={(e) => setLocationText(e.target.value)}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white rounded-md p-2"
                            placeholder={t('locationPlaceholder')}
                         />
                    </div>
                </div>

                {isFetchingWeather && <div className="text-sm text-center text-gray-500 dark:text-gray-400">{t('fetchingData')}</div>}

                {weatherData && (
                     <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('cropAndFertilizerAdvice')}</h2>
                        <WeatherDisplay data={weatherData} t={t} />
                        <div>
                            <label htmlFor="soil-condition" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('soilCondition')}</label>
                            <select
                                id="soil-condition"
                                value={soilCondition}
                                onChange={(e) => setSoilCondition(e.target.value as 'good' | 'low')}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                            >
                                <option value="good">{t('good')}</option>
                                <option value="low">{t('low')}</option>
                            </select>
                        </div>
                        <button
                            onClick={handleGetCropAdvice}
                            disabled={isLoading}
                            className="w-full px-4 py-2 text-base font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 flex justify-center items-center"
                        >
                             {isLoading ? <><Spinner /> <span className="ml-2">{t('gettingAdvice')}</span></> : t('getAdvice')}
                        </button>
                    </div>
                )}


                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('voiceChatbotTitle')}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t('voiceChatbotDesc')}</p>
                    <button
                        onClick={handleToggleVoice}
                        disabled={isConnecting}
                        className={`w-auto px-6 py-2 text-base font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 flex items-center justify-center transition-colors
                            ${isSessionActive ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'} disabled:opacity-70`}
                    >
                        {isConnecting ? <Spinner /> : isSessionActive ? t('stopChatbot') : t('speakToChatbot')}
                    </button>
                    {voiceError && <p className="text-sm text-red-500 mt-2">{voiceError}</p>}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('diseaseDetectionTitle')}</h2>
                    <div className="mt-3">
                        <ImageUploader onFileSelect={setImageFile} selectedFile={imageFile} t={t} />
                    </div>
                    {imageFile && (
                        <button
                            onClick={handleImageAnalysis}
                            disabled={isLoading}
                            className="mt-4 w-full px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex justify-center items-center"
                        >
                            {isLoading ? <><Spinner /> <span className="ml-2">{t('analyzing')}</span></> : t('analyzePlant')}
                        </button>
                    )}
                </div>

                <ResultDisplay isLoading={isLoading} result={result} t={t} />
            </main>
        </div>
    );
};

export default App;