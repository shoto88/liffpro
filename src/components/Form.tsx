import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import liff from "@line/liff";
import axios from "axios";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import "../App.css";

// import { LiffMockPlugin } from '@line/liff-mock';

// liff.use();

import LIFFInspectorPlugin from '@line/liff-inspector';

liff.use(new LIFFInspectorPlugin());

const formSchema = z.object({
  examinationNumber: z
    .string()
    .min(1, { message: "診察券番号を入力してください。" })
    .regex(/^[0-9]+$/, { message: "半角数字のみで入力してください。" }),
});

type FormValues = z.infer<typeof formSchema>;


function Form1() {
  const [liffInitStatus, setLiffInitStatus] = useState("initializing");

  const [submitResult, setSubmitResult] = useState("");
  const [error, setError] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      examinationNumber: "",
    },
  });

  useEffect(() => {
    const initializeLiff = async () => {
      try {
        await liff.init({
          liffId: import.meta.env.VITE_LIFF_ID_FORM as string,
        })
        if (!liff.isLoggedIn()) {
          console.log("ログインしていません");
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
      }
    };

    initializeLiff();
  }, []);


  const handleLogin = () => {
    liff.login();
  };


  const onSubmit = async (data: FormValues) => {
    try {
      const accessToken = liff.getAccessToken();
      console.log(accessToken);
      if (!accessToken) {
        throw new Error("アクセストークンがありません。");
      }
  
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/follow/examination-number`,
        { examinationNumber: data.examinationNumber },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      console.log(response.data.message);
      setSubmitResult(response.data.message);
    } catch (error) {
      setError("登録に失敗しました。");
      console.error("Error registering examination number:", error);
    }
  };
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="bg-white border-2 border-gray-100 p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center mb-4">
          診察券番号登録
        </h1>

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
        {liffInitStatus === "login-required" && (
          <button
            onClick={handleLogin}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            LINE Login
          </button>
        )}
        {liffInitStatus === "success" && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="examinationNumber"
                render={({ field }) => (
                  <FormItem className='flex flex-col'>
                    <FormLabel className='text-left mb-2'>ご登録いただけますと<br />lineを診察券代わりに利用できます😊</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="半角数字で診察券番号を入力" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="bg-pink-400 hover:bg-pink-600 flex flex-col items-left text-white font-bold py-2 px-4 rounded shadow-lg ml-auto transition-transform duration-100 active:translate-y-1 active:shadow-none"
            >登録</Button>
            </form>
          </Form>
        )}

        {submitResult && <p className="text-green-500 text-center mt-4">{submitResult}</p>}
      </div>
    </div>
  );
}

export default Form1;
