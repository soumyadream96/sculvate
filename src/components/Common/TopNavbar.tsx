import React, { useState } from "react";
import { Transition } from "@headlessui/react";
import { Link } from "react-router-dom";
import logo from "../../images/logo.png";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div>
        <nav className="backdrop-blur-md bg-opacity-60 bg-gray-50 shadow-xs py-[18px] fixed w-full z-50">
          <div className="max-w-[84rem] mx-auto px-8">
            <div className="flex items-center justify-between h-11">
              <div className="flex items-center w-full">
                <div className="flex-shrink-0 w-64 h-32">
                  <img src={logo}  alt="Logo" />
                </div>

                {/* DESKTOP */}
                <div className="block">
                  <div className="ml-[102px] flex space-x-8 items-baseline">
                    <a
                      href="#abc"
                      className=" text-md text-gray-600 font-semibold"
                    >
                      Home
                    </a>

                    <a
                      href="#abc"
                      className=" text-md text-gray-600 font-semibold"
                    >
                      Product
                    </a>

                    <a
                      href="#abc"
                      className=" text-md text-gray-600 font-semibold"
                    >
                      Contact
                    </a>

                    <a
                      href="#abc"
                      className=" text-md text-gray-600 font-semibold"
                    >
                      About
                    </a>

                    <a href="#abc" className="">
                      <button
                        onClick={() => setIsOpen(!isOpen)}
                        type="button"
                        className="flex items-center text-md text-gray-600 font-semibold"
                      >
                        <span className="mr-2">Resources</span>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M5 7.5L10 12.5L15 7.5"
                            stroke="#475467"
                            strokeWidth="1.66667"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>

                      <Transition
                        show={isOpen}
                        enter="transition ease-out duration-100 transform"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="transition ease-in duration-75 transform"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                        className="relative z-10"
                      >
                        <div>
                          <div className="bg-white border border-gray-600 absolute top-3 w-36 rounded-lg">
                            <ul>
                              <li className="py-2 px-4 text-md text-gray-600 font-semibold">
                                Option 1
                              </li>
                              <li className="py-2 px-4 text-md text-gray-600 font-semibold">
                                Option 2
                              </li>
                              <li className="py-2 px-4 text-md text-gray-600 font-semibold">
                                Option 3
                              </li>
                            </ul>
                          </div>
                        </div>
                      </Transition>
                    </a>
                  </div>
                </div>

                <div className="ml-auto flex items-center space-x-3">
                  <Link to="/login">
                    <button className="border border-transparent w-[83px] h-11 rounded-lg text-md text-gray-600 font-semibold active:text-gray-900 hover:underline">
                      Log in
                    </button>
                  </Link>
                  <Link to="/signup">
                    <button className="bg-primary-600 hover:bg-primary-700 active:bg-primary-800 hover:transition duration-150 shadow-lg hover:shadow-primary-600/50 w-[95px] h-11 rounded-lg text-md text-white font-semibold">
                      Sign up
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}

export default Navbar;
