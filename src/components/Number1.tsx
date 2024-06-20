
import { useEffect, useState } from "react";
import { useQuery } from "react-query";
import liff from "@line/liff";
import axios from "axios";
import "../App.css";

function Number1() {
  const [liffInitStatus, setLiffInitStatus] = useState("initializing");
  const [ error,setError] = useState<string | null>(null);

  // const handleLogin = () => {
  //   liff.login();
  // };

  const {
    isLoading: isLoadingTicket,
    error: ticketError,
    data: ticketData,
  } = useQuery<any,Error,any>(
    "ticketData",
    async () => {
      const profile = await liff.getProfile();
      const response = await axios.get(
        "https://my-app.shotoharu.workers.dev/api/lineinfo"
      );
      return response.data.find(
        (item: any) => item.line_user_id === profile.userId
      );
    },
    {
      enabled: liffInitStatus === "success",
    }
  );

  const { isLoading: isLoadingExamination, error: examinationError, data: examinationData } = useQuery<any, Error, any>(
    "examinationData",
    async () => {
      const profile = await liff.getProfile();
      const response = await axios.get(
        `https://my-app.shotoharu.workers.dev/api/follow/${profile.userId}/examination-number` // 新しいエンドポイント
      );
      return response.data;
    },
    {
      enabled: liffInitStatus === "success",
    }
  );

  useEffect(() => {
    const initializeLiff = async () => {
      try {
        await liff.init({
          liffId: import.meta.env.VITE_LIFF_ID as string,

        }).then(() => {
          if (liff.isLoggedIn()) {
          setLiffInitStatus("success");
        } else {
            setLiffInitStatus("login-required");
          }
        });
      } catch (error) {
        setLiffInitStatus("failed");
        setError(error instanceof Error ? error.message : "Unknown Error");
      }
    };

    initializeLiff();
  }, []);

  

  return (
    <div className="bg-orange-400 rounded-xl shadow-lg p-8 m-0  max-w-2xl mx-auto">
    {liffInitStatus === "failed" && (
      <p className="text-red-500">エラー: {error}</p>
    )}
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

      {/* LIFF init failedとlogin-requiredの表示は省略 */}
      {/* LIFF Documentationへのリンクも省略 */}
    </div>
  );
}

export default Number1;

