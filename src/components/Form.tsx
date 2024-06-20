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

const formSchema = z.object({
  examinationNumber: z.string().min(1, { message: "診察券番号を入力してください。" }),
});

type FormValues = z.infer<typeof formSchema>;

function Form1() {
  const [liffInitStatus, setLiffInitStatus] = useState("initializing");
  const [userId, setUserId] = useState<string | null>(null);
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
          liffId: import.meta.env.VITE_LIFF_ID2 as string,
        });
        if (liff.isLoggedIn()) {
          setLiffInitStatus("success");

          const profile = await liff.getProfile();
          setUserId(profile.userId); // LINE IDを取得
        } else {
          setLiffInitStatus("login-required");
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
      if (!userId) {
        throw new Error("LINE IDが取得できません。");
      }

      const response = await axios.put(
        `https://backend.shotoharu.workers.dev/api/follow/${userId}/examination-number`,
        { examinationNumber: data.examinationNumber }
      );
      setSubmitResult(response.data.message);
    } catch (error) {
      setError("更新に失敗しました。");
      console.error("Error updating examination number:", error);
    }
  };

  return (
    <div className="bg-orange-400 min-h-screen flex flex-col items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
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
                  <FormItem>
                    <FormLabel>診察券番号</FormLabel>
                    <FormControl>
                      <Input placeholder="半角数字で診察券番号を入力" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">更新</Button>
            </form>
          </Form>
        )}

        {submitResult && <p className="text-green-500 text-center mt-4">{submitResult}</p>}
      </div>
    </div>
  );
}

export default Form1;
