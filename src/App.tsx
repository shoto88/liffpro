// import { useEffect, useState } from "react";
// import liff from "@line/liff";
// import axios from "axios";
// import "./App.css";

// function App() {
//   const [liffInitStatus, setLiffInitStatus] = useState("initializing"); // LIFFの初期化状態
//   const [ticketNumber, setTicketNumber] = useState<number | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const initializeLiff = async () => {
//       try {
//         await liff.init({
//           liffId: import.meta.env.VITE_LIFF_ID,
//         });
        
//         // 初期化成功時の処理
//         if (liff.isLoggedIn()) {
//           // ログイン済みの場合
//           setLiffInitStatus("success");

//           const profile = await liff.getProfile();

//           try {
//             const response = await axios.get('https://lineback.shotoharu.workers.dev/api/lineinfo');
//             const userTicket = response.data.find(
//               (item: any) => item.line_user_id === profile.userId
//             );
//             if (userTicket) {
//               setTicketNumber(userTicket.ticket_number);
//             } else {
//               setError("まだ発券していません。");
//             }
//           } catch (error) {
//             setError("発券情報の取得に失敗しました。");
//             console.error("Error fetching ticket data:", error);
//           }
//         } else {
//           // 未ログインの場合
//           setLiffInitStatus("login-required");
//         }
//       } catch (error) {
//         // 初期化失敗時の処理
//         setLiffInitStatus("failed");
//         setError(error instanceof Error ? error.message : "Unknown Error");
//       }
//     };

//     initializeLiff();
//   }, []);

//   const handleLogin = () => {
//     liff.login(); // ログイン処理
//   };

//   return (
//     <div className="App bg-gradient-to-r from-pink-200 to-blue-200 min-h-screen flex flex-col items-center justify-center">
//       <div className="bg-white p-8 rounded-lg shadow-md grid grid-cols-2 gap-4"> {/* グリッドレイアウト */}
//         <div className="text-center border rounded-md p-4">
//           <h2 className="text-xl font-bold mb-2">診察券番号</h2>
//           {examinationNumber ? (
//             <p className="text-2xl">{examinationNumber}</p>
//           ) : (
//             <p className="text-gray-500">まだ登録されていません</p>
//           )}
//         </div>

//         <div className="text-center border rounded-md p-4">
//           <h2 className="text-xl font-bold mb-2">LINE発券番号</h2>
//           {ticketNumber ? (
//             <p className="text-2xl">{ticketNumber}</p>
//           ) : (
//             <p className="text-gray-500">LINEから発券されていません</p>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// export default App;
// import { useEffect, useState } from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import liff from "@line/liff";
// import axios from "axios";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import "./App.css";

// const formSchema = z.object({
//   examinationNumber: z.string().min(1, { message: "診察券番号を入力してください。" }),
// });

// type FormValues = z.infer<typeof formSchema>;

// function App() {
//   const [liffInitStatus, setLiffInitStatus] = useState("initializing");
//   const [userId, setUserId] = useState<string | null>(null);
//   const [submitResult, setSubmitResult] = useState("");
//   const [error, setError] = useState("");

//   const form = useForm<FormValues>({
//     resolver: zodResolver(formSchema),
//     defaultValues: {
//       examinationNumber: "",
//     },
//   });

//   useEffect(() => {
//     const initializeLiff = async () => {
//       try {
//         await liff.init({
//           liffId: import.meta.env.VITE_LIFF_ID,
//         });
//         if (liff.isLoggedIn()) {
//           setLiffInitStatus("success");

//           const profile = await liff.getProfile();
//           setUserId(profile.userId); // LINE IDを取得
//         } else {
//           setLiffInitStatus("login-required");
//         }
//       } catch (error) {
//         setLiffInitStatus("failed");
//         setError(error instanceof Error ? error.message : "Unknown Error");
//       }
//     };

//     initializeLiff();
//   }, []);

//   const handleLogin = () => {
//     liff.login();
//   };

//   const onSubmit = async (data: FormValues) => {
//     try {
//       if (!userId) {
//         throw new Error("LINE IDが取得できません。");
//       }

//       const response = await axios.put(
//         `https://lineback.shotoharu.workers.dev/api/follow/${userId}/examination-number`,
//         { examinationNumber: data.examinationNumber }
//       );
//       setSubmitResult(response.data.message);
//     } catch (error) {
//       setError("更新に失敗しました。");
//       console.error("Error updating examination number:", error);
//     }
//   };

//   return (
//     <div className="App bg-gradient-to-r from-pink-200 to-blue-200 min-h-screen flex flex-col items-center justify-center">
//       <div className="bg-white p-8 rounded-lg shadow-md">
//         <h1 className="text-3xl font-bold text-center mb-4">
//           診察券番号更新
//         </h1>

//         {liffInitStatus === "initializing" && (
//           <p className="text-gray-500 text-center">LIFF Initializing...</p>
//         )}
//         {liffInitStatus === "failed" && (
//           <div className="text-red-500 text-center">
//             <p>LIFF init failed.</p>
//             <p>
//               <code>{error}</code>
//             </p>
//           </div>
//         )}
//         {liffInitStatus === "login-required" && (
//           <button
//             onClick={handleLogin}
//             className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
//           >
//             LINE Login
//           </button>
//         )}
//         {liffInitStatus === "success" && (
//           <Form {...form}>
//             <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
//               <FormField
//                 control={form.control}
//                 name="examinationNumber"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>診察券番号</FormLabel>
//                     <FormControl>
//                       <Input placeholder="診察券番号" {...field} />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//               <Button type="submit">更新</Button>
//             </form>
//           </Form>
//         )}

//         {submitResult && <p className="text-green-500 text-center mt-4">{submitResult}</p>}
//       </div>
//     </div>
//   );
// }

// export default App;
import Number1 from "./components/Number1.tsx";
import Form1 from "./components/Form";
import "../app/globals.css"
import { Route, Routes } from 'react-router-dom';
const App = () => {
  return (
  <div>
  
  <div>
    <Routes>
      <Route path="/" element={<Number1 />} />
      <Route path="/form" element={<Form1 />} />
    </Routes>
  </div>
  </div>
  )
  }

  export default App;