import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import liff from "@line/liff/core";
import IsLoggedIn from "@line/liff/is-logged-in";
import Login from "@line/liff/login";
import GetAccessToken from "@line/liff/get-access-token";
import axios from "axios";
import "../App.css";


liff.use(new IsLoggedIn());
liff.use(new Login());
liff.use(new GetAccessToken());


function Number1() {
  const [liffInitStatus, setLiffInitStatus] = useState("initializing");
  const [ error,setError] = useState<string | null>(null);
  const [isLoadingLiff, setIsLoadingLiff] = useState(true); // LIFF初期化中フラグ
  const [needRelogin, setNeedRelogin] = useState(false);
  // 来院タップの結果（タップ直後の表示更新用。初期状態はticketDataのarrivedから決まる）
  const [arrivedInfo, setArrivedInfo] = useState<{
    arrived: boolean;
    at: string | null;
  } | null>(null);
  // タップできなかったときの案内文（開院前など）
  const [tapMessage, setTapMessage] = useState<string | null>(null);
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
      queryClient.invalidateQueries("examinationData");
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
      const accessToken = liff.getAccessToken(); // アクセストークンを取得
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
      return response.data;// サーバー側でユーザーIDに基づいて情報を返すように変更
   },
    {
      enabled: liffInitStatus === "success" && !isLoadingLiff && !needRelogin,
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
        `${import.meta.env.VITE_API_BASE_URL}/liff/follow/examination-number`,
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



  // 来院したのでタップ → クリニックの受付画面に「来院済み」として表示される
  const arrivedMutation = useMutation(
    async () => {
      const accessToken = liff.getAccessToken();
      if (!accessToken) {
        throw new Error("アクセストークンがありません。");
      }
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/liff/arrived`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return response.data;
    },
    {
      onSuccess: (data) => {
        if (data?.ok) {
          setArrivedInfo({ arrived: true, at: data.arrived_at ?? null });
          setTapMessage(null);
        } else if (data?.reason === "too_early") {
          setTapMessage(
            `まだ開院前です。来院タップは ${data.accept_from} から受け付けています。ご来院後にもう一度タップしてください🙇‍♂️`
          );
        } else if (data?.reason === "deactivated") {
          setTapMessage(
            "この番号は無効になっています。お手数ですが受付にお声がけください。"
          );
        } else if (data?.reason === "no_ticket") {
          setTapMessage("本日の発券が見つかりませんでした。");
        }
        queryClient.invalidateQueries("ticketData");
      },
      onError: handleApiError,
    }
  );

  // 表示上の来院状態: タップ直後はローカル状態、それ以外はサーバーの値
  const effectiveArrived =
    arrivedInfo ??
    (ticketData?.arrived === 1
      ? { arrived: true, at: ticketData?.arrived_at ?? null }
      : { arrived: false, at: null });

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
            <p className="text-gray-500 mt-3">Loading...</p>
          ) : examinationError ? (
            <p className="text-red-500 text-sm">再ログインが必要です</p>
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
            <p className="text-red-500 text-sm">再ログインが必要です</p>
          ) : ticketData?.ticket_number ? (
            <span className="text-4xl flex items-center justify-center  mt-5 font-semibold">{ticketData.ticket_number}</span>
          ) : (
            <p className="text-gray-500">LINEから発券されていません</p>
          )}
        </div>
      </div>

      {/* 来院タップ: 発券があり、無効化されていない場合に表示 */}
      {!isLoadingTicket &&
        !ticketError &&
        ticketData?.ticket_number &&
        ticketData?.status !== 2 && (
          <div className="mt-4 text-center">
            {effectiveArrived.arrived ? (
              <div className="bg-green-500 text-white rounded-xl shadow-md py-4 px-6 font-bold text-lg">
                ✅ 来院済み{effectiveArrived.at ? `（${effectiveArrived.at}）` : ""}
                <p className="text-sm font-normal mt-1">
                  受付に保険証をご提示ください
                </p>
              </div>
            ) : (
              <button
                onClick={() => arrivedMutation.mutate()}
                disabled={arrivedMutation.isLoading}
                className="w-full bg-white text-orange-500 rounded-xl shadow-md py-4 px-6 font-bold text-xl active:scale-95 transition-transform disabled:opacity-60"
              >
                {arrivedMutation.isLoading
                  ? "記録中..."
                  : "🏥 来院したのでタップ"}
              </button>
            )}
            {tapMessage && (
              <p className="mt-3 text-sm text-white bg-yellow-500 bg-opacity-90 rounded-lg p-3 text-left">
                {tapMessage}
              </p>
            )}
          </div>
        )}
      {ticketData?.status === 2 && (
        <p className="mt-4 text-center text-white text-sm bg-red-400 rounded-lg p-2">
          この番号は無効になっています。お手数ですが受付にお声がけください
        </p>
      )}

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

export default Number1;

