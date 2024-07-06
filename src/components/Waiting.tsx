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

  useEffect(() => {
    const initializeLiff = async () => {
      try {
        await liff.init({
          liffId: import.meta.env.VITE_LIFF_ID_WAIT as string,
        })
        if (!liff.isLoggedIn()) {
          setLiffInitStatus("login-required");
        } else {
          liff.ready.then(() => {
            setLiffInitStatus("success");
          });
        }
      } catch (error) {
        setLiffInitStatus("failed");
        setError(error instanceof Error ? error.message : "Unknown Error");
        return; 
      }

      liff.ready
        .then(() => {
          setLiffInitStatus("success");
        })
        .catch((error) => {
          setLiffInitStatus("failed");
          setError(error instanceof Error ? error.message : "Unknown Error");
        })
        .finally(() => {
          setIsLoadingLiff(false);
        });
    };
    initializeLiff();
  }, []);

  const fetchWaitingTime = async (number: string) => {
    try {
      const accessToken = liff.getAccessToken();
      if (!accessToken) {
        throw new Error("アクセストークンがありません。");
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/waiting-time/${number}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setWaitingTime(response.data.waitingTime);
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchWaitingTime(inputNumber);
  };

  return (
    <div className="bg-orange-400 rounded-xl shadow-lg p-8 m-0 max-w-2xl mx-auto">
      {liffInitStatus === "initializing" && (
        <p className="text-gray-500 text-center">LIFF Initializing...</p>
      )}
      {liffInitStatus === "failed" && (
        <div className="text-red-500 text-center">
          <p>LIFF init failed.</p>
          <p>
            <code>{error}</code>
          </p>
        </div>
      )}
      {liffInitStatus === "success" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl text-white font-bold">大濠パーククリニック🏥</h1>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <h2 className="text-lg font-bold mb-4">待ち時間確認</h2>
            {isLoadingTicket ? (
              <p className="text-gray-500">Loading...</p>
            ) : ticketError ? (
              <p className="text-red-500 text-sm">再ログインが必要です</p>
            ) : ticketData?.ticket_number ? (
              <>
                <p className="mb-2">あなたの発券番号: {ticketData.ticket_number}</p>
                <Button
                  onClick={() => fetchWaitingTime(ticketData.ticket_number.toString())}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  待ち時間を確認
                </Button>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4">
                <Input
                  type="number"
                  value={inputNumber}
                  onChange={(e) => setInputNumber(e.target.value)}
                  placeholder="発券番号を入力してください"
                  className="mb-2 p-2 border rounded"
                />
                <Button 
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  待ち時間を確認
                </Button>
              </form>
            )}
            {waitingTime !== null && (
              <p className="mt-4 text-lg font-bold">予想待ち時間: {waitingTime}分</p>
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