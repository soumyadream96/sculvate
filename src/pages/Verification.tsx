import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";
import art from "../images/loginArt.png";
import logo from "../images/logo.png";
import mailIcon from "../images/mail_icon.svg";
import { useAppDispatch } from "state/hooks";
import { setTokens, setUserData } from "state/reducers/authSlice";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Verification() {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [codeFlag, setCodeFlag] = useState(false);

  useEffect(() => {
    document.title = `Verification | SCULVATE`;
  }, []);

  const handleSubmit = (evt: any) => {
    evt.preventDefault();
    const email = location.state.email || evt.target.email.value;
    const code = evt.target.code?.value;
    const password = evt.target.password?.value;

    if (location.state.forgotPassword) {
      if (!codeFlag) {
        setIsLoading(true);
        Auth.forgotPassword(email)
          .then((data) => {
            setCodeFlag(true);
            setIsLoading(false);
          })
          .catch((err) => {
            if (err.message.includes("Invalid verification code provided")) {
              toast.error("Invalid verification code. Please try again.", {
                toastId: "error",
              });
            } else if (err.message.includes("exceeded")) {
              toast.error("Attempt limit exceeded. Please try again later.", {
                toastId: "error",
              });
            } else {
              toast.error(err.message, {
                toastId: "error",
              });
            }
            setIsLoading(false);
          });
      } else {
        setIsLoading(true);
        Auth.forgotPasswordSubmit(email, code, password)
          .then((data) => {
            Auth.signIn(email, password)
              .then((user: any) => {
                localStorage.setItem(
                  "idToken",
                  user.signInUserSession.idToken.jwtToken
                );
                dispatch(
                  setUserData({
                    username: user.username,
                    name: "",
                    email: user.attributes.email,
                    userPlan: user.attributes["custom:userPlan"],
                  })
                );
                dispatch(
                  setTokens({
                    idToken: user.signInUserSession.idToken.jwtToken,
                  })
                );
                setIsLoading(false);
              })
              .catch((err) => {
                if (
                  err.message.includes("Invalid verification code provided")
                ) {
                  toast.error("Invalid verification code. Please try again.", {
                    toastId: "error",
                  });
                } else if (err.message.includes("exceeded")) {
                  toast.error(
                    "Attempt limit exceeded. Please try again later.",
                    {
                      toastId: "error",
                    }
                  );
                } else {
                  toast.error(err.message, {
                    toastId: "error",
                  });
                }
                setIsLoading(false);
              });
          })
          .catch((err) => {
            if (err.message.includes("Invalid verification code provided")) {
              toast.error("Invalid verification code. Please try again.", {
                toastId: "error",
              });
            } else if (err.message.includes("exceeded")) {
              toast.error("Attempt limit exceeded. Please try again later.", {
                toastId: "error",
              });
            } else {
              toast.error(err.message, {
                toastId: "error",
              });
            }
            setIsLoading(false);
          });
      }
    } else {
      setIsLoading(true);
      Auth.confirmSignUp(email, code)
        .then((data) => {
          if (data === "SUCCESS") {
            navigate("/projects", { replace: true });
          }
        })
        .catch((err) => {
          if (err.message.includes("Invalid verification code provided")) {
            toast.error("Invalid verification code. Please try again.", {
              toastId: "error",
            });
          } else if (err.message.includes("exceeded")) {
            toast.error("Attempt limit exceeded. Please try again later.", {
              toastId: "error",
            });
          } else {
            toast.error(err.message, {
              toastId: "error",
            });
          }
          setIsLoading(false);
        });
    }
  };

  return (
    <div className="flex overflow-y-auto h-screen lg:h-auto">
      <div className="w-full lg:w-1/2 flex flex-col justify-between gap-7 px-4 lg:px-0">
        <div className="flex-shrink-0 w-64 h-32">
          <img src={logo} alt="logo" />
        </div>

        <div className="lg:max-w-[360px] lg:mx-auto lg:py-[140px]">
          {/* Top Title */}
          <div className="text-center mb-8">
            <h2 className="text-tsm font-semibold text-gray-900 mb-3">
              {location.state.forgotPassword
                ? "Reset your password"
                : "Check your mail"}
            </h2>
            <p className="text-md text-gray-500">
              {location.state.forgotPassword
                ? "If your email is correct, you'll receive a verification code to reset your password."
                : "Enter the verification code sent to your email to get started. Be sure to also check your spam!"}
            </p>
          </div>

          {/* Form */}
          <form className="space-y-6 mb-8" onSubmit={handleSubmit}>
            <div className="space-y-5">
              {location.state.forgotPassword && (
                <>
                  <div className="w-full">
                    <label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-700"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      className="w-full h-11 px-3.5 mt-1.5 bg-white border border-gray-300 shadow-xs rounded-lg text-gray-600 text-md placeholder:text-gray-500 focus:ring-gray-300 focus:border-gray-300 focus-visible:ring-gray-300 focus-visible:outline-0"
                      placeholder="Enter your email"
                      disabled={codeFlag}
                      required
                    />
                  </div>

                  {codeFlag && (
                    <>
                      <div className="w-full">
                        <label
                          htmlFor="code"
                          className="text-sm font-medium text-gray-700"
                        >
                          Verification code
                        </label>
                        <input
                          type="text"
                          name="code"
                          className="w-full h-11 px-3.5 mt-1.5 bg-white border border-gray-300 shadow-xs rounded-lg text-gray-600 text-md placeholder:text-gray-500 focus:ring-gray-300 focus:border-gray-300 focus-visible:ring-gray-300 focus-visible:outline-0"
                          placeholder="Enter verification code"
                          required
                        />
                      </div>
                      <div className="w-full">
                        <label
                          htmlFor="password"
                          className="text-sm font-medium text-gray-700"
                        >
                          New password
                        </label>
                        <input
                          type="password"
                          name="password"
                          className="w-full h-11 px-3.5 mt-1.5 bg-white border border-gray-300 shadow-xs rounded-lg text-gray-600 text-md placeholder:text-gray-500 focus:ring-gray-300 focus:border-gray-300 focus-visible:ring-gray-300 focus-visible:outline-0"
                          placeholder="Enter new password"
                          required
                        />
                      </div>
                    </>
                  )}
                </>
              )}
              {!location.state.forgotPassword && (
                <div className="w-full">
                  <label
                    htmlFor="code"
                    className="text-sm font-medium text-gray-700"
                  >
                    Verification code
                  </label>
                  <input
                    type="text"
                    name="code"
                    className="w-full h-11 px-3.5 mt-1.5 bg-white border border-gray-300 shadow-xs rounded-lg text-gray-600 text-md placeholder:text-gray-500 focus:ring-gray-300 focus:border-gray-300 focus-visible:ring-gray-300 focus-visible:outline-0"
                    placeholder="Enter verification code"
                    required
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <button
                className={`w-full h-11 shadow-xs rounded-lg text-md font-semibold text-white
  ${
    !isLoading
      ? "bg-primary-600 hover:bg-primary-700 active:bg-primary-800 hover:transition duration-150 shadow-lg hover:shadow-primary-600/50"
      : "bg-primary-300"
  }`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <svg
                    aria-hidden="true"
                    className="w-6 h-6 text-gray-200 animate-spin dark:text-gray-600 fill-white inline"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="currentFill"
                    />
                  </svg>
                ) : location.state.forgotPassword && !codeFlag ? (
                  "Request verification code"
                ) : location.state.forgotPassword && codeFlag ? (
                  "Reset password"
                ) : (
                  "Verify email"
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="h-24 flex items-center justify-between lg:px-8 text-sm text-gray-600">
          <div>© {new Date().getFullYear()} SCULVATE - All rights reserved.</div>
          <div className="flex items-center">
            <img className="mr-2" src={mailIcon} alt="mail-icon" />
            hello@SCULVATE
          </div>
        </div>
      </div>

      <div className="hidden lg:!block w-1/2">
        <img className="w-full h-full object-cover" src={art} alt="art" />
      </div>
      <ToastContainer
        position="bottom-center"
        autoClose={5000}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}

export default Verification;
