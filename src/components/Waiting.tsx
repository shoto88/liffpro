import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "react-query";
import liff from "@line/liff/core";
import IsLoggedIn from "@line/liff/is-logged-in";
import Login from "@line/liff/login";
import GetAccessToken from "@line/liff/get-access-token";
import axios from "axios";
import "../App.css";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

liff.use(new IsLoggedIn());
liff.use(new Login());
liff.use(new GetAccessToken());

function WaitingTimeChecker() {
  const [liffInitStatus, setLiffInitStatus] = useState("initializing");
  const [error, setError] = useState<string | null>(null);
  const [isLoadingLiff, setIsLoadingLiff] = useState(true);
  const [needRelogin, setNeedRelogin] = useState(false);
  const [inputNumber, setInputNumber] = useState('');
  const [waitingTime, setWaitingTime] = useState<number | null>(null);
  const [currentTreatment, setCurrentTreatment] = useState<number | null>(null);
  const [showWaitingInfo, setShowWaitingInfo] = useState(false);
  const [isAutoFetched, setIsAutoFetched] = useState(false);
  const queryClient = useQueryClient();

  const handleApiError = async (error: any) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      setNeedRelogin(true);
      setError("再ログインが必要です。下のボタンをクリックしてください。");
    } else {
      setError("データの取得に失敗しました。ネットワーク接続を確認してください。");
      console.error("Error fetching data:", error);
    }
  };

  const handleRelogin = async () => {
    try {
      await liff.login();
      setNeedRelogin(false);
      setError(null);
      queryClient.invalidateQueries("ticketData");
      queryClient.invalidateQueries("waitingTimeInfo");
    } catch (loginError) {
      setError("ログインに失敗しました。しばらく経ってからもう一度お試しください。");
      console.error("Error during re-login:", loginError);
    }
  };

  const {
    isLoading: isLoadingTicket,
    error: ticketError,
    data: ticketData,
  } = useQuery<any, Error, any>(
    "ticketData",
    async () => {
      const accessToken = liff.getAccessToken();
      if (!accessToken) {
        throw new Error("アクセストークンがありません。");
      }
     
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/liff/tickets/number`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return response.data;
    },
    {
      enabled: liffInitStatus === "success" && !isLoadingLiff && !needRelogin,
      retry: false,
      onError: handleApiError,
    }
  );

  const {
    isLoading: isLoadingWaitingTimeInfo,
    error: waitingTimeInfoError,
    data: waitingTimeInfo,
  } = useQuery<any, Error, any>(
    "waitingTimeInfo",
    async () => {
      const accessToken = liff.getAccessToken();
      if (!accessToken) {
        throw new Error("アクセストークンがありません。");
      }
     
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/liff/waiting-time-info`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return response.data;
    },
    {
      enabled: liffInitStatus === "success" && !isLoadingLiff && !needRelogin,
      retry: false,
      onError: handleApiError,
    }
  );

  useEffect(() => {
    const initializeLiff = async () => {
      try {
        await liff.init({
          liffId: import.meta.env.VITE_LIFF_ID_WAIT as string,
        });
        if (!liff.isLoggedIn()) {
          console.log("ログインしていません");
          setLiffInitStatus("login-required");
        } else {
          liff.ready.then(() => {
            setLiffInitStatus("success");
          });
        }
      } catch (error) {
        setLiffInitStatus("failed");
        setError(error instanceof Error ? error.message : "Unknown Error");
      } finally {
        setIsLoadingLiff(false);
      }
    };
    initializeLiff();
  }, []);

  useEffect(() => {
    if (ticketData?.ticket_number) {
      setInputNumber(ticketData.ticket_number.toString());
      setIsAutoFetched(true);
    } else {
      setIsAutoFetched(false);
    }
  }, [ticketData]);

  const calculateWaitingTime = () => {
    if (waitingTimeInfo && inputNumber) {
      const ticketNumber = parseInt(inputNumber);
      const peopleAhead = Math.max(0, ticketNumber - waitingTimeInfo.currentTreatment);
      const estimatedWaitingTime = peopleAhead * waitingTimeInfo.averageExaminationTime;
      setWaitingTime(estimatedWaitingTime);
      setCurrentTreatment(waitingTimeInfo.currentTreatment);
      setShowWaitingInfo(true);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    calculateWaitingTime();
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      {liffInitStatus === "initializing" && (
        <p className="text-gray-500 text-center">LIFF Initializing...</p>
      )}
      {liffInitStatus === "failed" && (
        <div className="text-red-500 text-center">
          <p>LIFF init failed.</p>
          <p><code>{error}</code></p>
        </div>
      )}
      {liffInitStatus === "success" && (
        <>
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold mb-4">待ち時間確認</h2>
            {isLoadingTicket || isLoadingWaitingTimeInfo ? (
              <p className="text-gray-500">Loading...</p>
            ) : ticketError || waitingTimeInfoError ? (
              <p className="text-red-500 text-sm">再ログインが必要です</p>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4">
                {isAutoFetched ? (
                  <div className="mb-4 p-2 bg-blue-100 rounded-md">
                    <p className="text-sm text-blue-800 mb-2">
                      LINEから発券された番号は以下です。受付にて番号に変更があった場合は下記を修正してください。
                    </p>
                  </div>
                ) : (
                  <p className="mb-2 text-sm text-gray-600">
                    発券番号を入力してください
                  </p>
                )}
                <Input
                  type="number"
                  value={inputNumber}
                  onChange={(e) => setInputNumber(e.target.value)}
                  placeholder="発券番号"
                  className={`mb-2 p-2 border rounded ${isAutoFetched ? 'border-blue-500' : 'border-gray-300'}`}
                />
                <Button 
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
                >
                  待ち時間を確認
                </Button>
              </form>
            )}
            {showWaitingInfo && (
              <div className="mt-4">
                {waitingTime !== null && (
                  <p className="text-lg font-bold">予想待ち時間: {waitingTime}分</p>
                )}
                {currentTreatment !== null && (
                  <p>現在診療中の番号: {currentTreatment}</p>
                )}
              </div>
            )}
          </div>
  
          {needRelogin && (
            <div className="mt-4 text-center">
              <p className="text-red-500 mb-2">{error}</p>
              <button 
                onClick={handleRelogin}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                再ログイン
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default WaitingTimeChecker;