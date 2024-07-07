import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import liff from "@line/liff/core";
import IsLoggedIn from "@line/liff/is-logged-in";
import Login from "@line/liff/login";
import GetAccessToken from "@line/liff/get-access-token";
import axios from "axios";
import "../App.css";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "./ui/form";

liff.use(new IsLoggedIn());
liff.use(new Login());
liff.use(new GetAccessToken());

const formSchema = z.object({
  ticketNumber: z
    .string()
    .min(1, { message: "発券番号を入力してください。" })
    .regex(/^[a-zA-Z0-9]+$/, { message: '半角英数字で入力してください' }),
});

type FormValues = z.infer<typeof formSchema>;

function WaitingTimeChecker() {
  const [liffInitStatus, setLiffInitStatus] = useState("initializing");
  const [error, setError] = useState<string | null>(null);
  const [isLoadingLiff, setIsLoadingLiff] = useState(true);
  const [needRelogin, setNeedRelogin] = useState(false);
  const [waitingTime, setWaitingTime] = useState<number | null>(null);
  const [currentTreatment, setCurrentTreatment] = useState<number | null>(null);
  const [showWaitingInfo, setShowWaitingInfo] = useState(false);
  const [isAutoFetched, setIsAutoFetched] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ticketNumber: "",
    },
  });

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
      form.setValue("ticketNumber", ticketData.ticket_number.toString());
      setIsAutoFetched(true);
    } else {
      setIsAutoFetched(false);
    }
  }, [ticketData, form]);

   const calculateWaitingTime = (ticketNumber: string) => {
    if (waitingTimeInfo && ticketNumber) {
      const ticketNum = parseInt(ticketNumber);
      const peopleAhead = Math.max(0, ticketNum - waitingTimeInfo.currentTreatment);
      const estimatedWaitingTime = peopleAhead * waitingTimeInfo.averageExaminationTime;
      setWaitingTime(estimatedWaitingTime);
      setCurrentTreatment(waitingTimeInfo.currentTreatment);
      setShowWaitingInfo(true);
    }
  };

  const onSubmit = (data: FormValues) => {
    calculateWaitingTime(data.ticketNumber);
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
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {isAutoFetched ? (
                    <div className="mb-4 p-2 bg-blue-100 rounded-md">
                      <p className="text-sm text-left text-blue-800 mb-2">
                        発券番号は以下です。<br />
                        受付にて番号に変更があった場合は新しい番号を入力してください。
                      </p>
                    </div>
                  ) : (
                    <p className="mb-2 text-sm text-gray-600">
                      発券番号を入力してください
                    </p>
                  )}
                  <FormField
                    control={form.control}
                    name="ticketNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            pattern="[0-9]*"
                            inputMode="numeric"
                            placeholder="発券番号"
                            {...field}
                            className={`mb-2 p-2 border rounded ${isAutoFetched ? 'border-blue-500' : 'border-gray-300'}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
                  >
                    待ち時間を確認
                  </Button>
                </form>
              </Form>
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