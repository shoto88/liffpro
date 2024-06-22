import { useEffect, useState, useRef } from "react";
import { useQuery, useQueryClient } from "react-query";
import liff from "@line/liff";
import axios from "axios";
import "../App.css";

import LIFFInspectorPlugin from '@line/liff-inspector';

liff.use(new LIFFInspectorPlugin());

function Number1() {
  const [liffInitStatus, setLiffInitStatus] = useState("initializing");
  const [ error,setError] = useState<string | null>(null);
  const [isLoadingLiff, setIsLoadingLiff] = useState(true); // LIFF初期化中フラグ
  const MAX_RETRY_COUNT = 3;
  const retryCountRef = useRef(0);
  const queryClient = useQueryClient();
  const handleApiError = async (error: any) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      if (retryCountRef.current < MAX_RETRY_COUNT) {
        try {
          await liff.login();
          retryCountRef.current += 1; // 同期的にカウントを増加
          
          // リトライカウントが上限に達していない場合のみクエリを無効化
          queryClient.invalidateQueries("ticketData");
          queryClient.invalidateQueries("examinationData");
        } catch (loginError) {
          setError("ログインに失敗しました。しばらく経ってからもう一度お試しください。");
          console.error("Error during re-login:", loginError);
        }
      } else {
        setError("ログインの試行回数が上限に達しました。アプリを再起動してください。");
      }
    } else {
      setError("データの取得に失敗しました。ネットワーク接続を確認してください。");
      console.error("Error fetching data:", error);
    }
  };


  const {
    isLoading: isLoadingTicket,
    error: ticketError,
    data: ticketData,
  } = useQuery<any, Error, any>(
    "ticketData",
    async () => {
      const accessToken = liff.getAccessToken(); // アクセストークンを取得
      if (!accessToken) {
        throw new Error("アクセストークンがありません。");
      }
      const expiredAccessToken = "your_expired_access_token"; 
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/tickets/number`,
        // {
        //   headers: {
        //     Authorization: `Bearer ${accessToken}`,
        //   },
        // }
        {
          headers: {
            Authorization: `Bearer ${expiredAccessToken}`,
          },
        }
      );
      return response.data;// サーバー側でユーザーIDに基づいて情報を返すように変更
   },
    {
      enabled: liffInitStatus === "success" && !isLoadingLiff, 
      retry: false,
      onError: handleApiError,
    }
  );
  const {
    isLoading: isLoadingExamination,
    error: examinationError,
    data: examinationData,
  } = useQuery<any, Error, any>(
    "examinationData",
    async () => {
      const accessToken = liff.getAccessToken();
      if (!accessToken) {
        throw new Error("アクセストークンがありません。");
      }
    
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/follow/examination-number`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return response.data;
    },
    {
      enabled: liffInitStatus === "success" && !isLoadingLiff,
      retry: false,
      onError: handleApiError,
    }
  );



  useEffect(() => {
    const initializeLiff = async () => {
      try {
        await liff.init({
          liffId: import.meta.env.VITE_LIFF_ID as string,
        })
        if (!liff.isLoggedIn()) {
          setLiffInitStatus("login-required");
        } else {
          // ログイン済みの場合は、liff.readyを待ってから処理を実行
          liff.ready.then(() => {
            setLiffInitStatus("success");
          });
        }
      } catch (error) {
        setLiffInitStatus("failed");
        setError(error instanceof Error ? error.message : "Unknown Error");
        return; 
      }

      // liff.ready が true になったら初期化成功
      liff.ready
        .then(() => {
          setLiffInitStatus("success");
        })
        .catch((error) => {
          setLiffInitStatus("failed");
          setError(error instanceof Error ? error.message : "Unknown Error");
        })
        .finally(() => {
          setIsLoadingLiff(false); // LIFF初期化完了 (成功または失敗)
        });
    };
    initializeLiff();
  }, []);

  

  return (
    <div className="bg-orange-400 rounded-xl shadow-lg p-8 m-0  max-w-2xl mx-auto">
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
        {/* HospitalIconコンポーネント */}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-pink-300 text-white rounded-xl shadow-md p-6 text-center">
          <h2 className="text-md mt-2 font-bold mb-2">診察券番号</h2>
          {isLoadingExamination ? (
            <p className="text-gray-500">Loading...</p>
          ) : examinationError ? (
            <p className="text-red-500">Error: {examinationError.message}</p>
          ) : examinationData?.examination_number ? (
            <span className="text-4xl flex items-center justify-center  mt-8 font-semibold">{examinationData.examination_number}</span>
          ) : (
            <p className="text-gray-500">まだ登録されていません</p>
          )}
        </div>

        <div className="bg-blue-400 text-white rounded-xl shadow-md p-6 text-center">
          <h2 className="text-md font-bold mb-2">LINE<br />発券番号</h2>
          {isLoadingTicket ? (
            <p className="text-gray-500">Loading...</p>
          ) : ticketError ? (
            <p className="text-red-500">Error: {ticketError.message}</p>
          ) : ticketData?.ticket_number ? (
            <span className="text-5xl font-semibold">{ticketData.ticket_number}</span>
          ) : (
            <p className="text-gray-500">LINEから発券されていません</p>
          )}
        </div>
      </div>
      </>
        )}
      {/* LIFF init failedとlogin-requiredの表示は省略 */}
      {/* LIFF Documentationへのリンクも省略 */}
    </div>
  );
}

export default Number1;

