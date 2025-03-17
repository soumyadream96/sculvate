import { useEffect, useState } from "react";
import MyIcon from "assets/MyIcons";
import { Auth, Storage } from "aws-amplify";
import { useNavigate } from "react-router-dom";
import {
  selectEmail,
  selectUserPlan,
  selectUsername,
} from "state/reducers/authSlice";
import { useAppSelector } from "state/hooks";
import api from "services/api";
import { Tooltip } from "react-tooltip";

interface Metrics {
  status: string;
  cpu: {
    cores: number;
    utilization: number;
  };
  memory: {
    memory: number;
    utilization: number;
  };
}

interface InstanceMetrics {
  [key: string]: Metrics;
}

function Overview() {
  const [isLoading, setIsLoading] = useState(false);
  const [isQuerying, setIsQuerying] = useState(true);
  const [projects, setProjects] = useState<Array<any>>([]);
  const [isQueryingMetrics, setIsQueryingMetrics] = useState(true);
  const [instanceMetrics, setInstanceMetrics] = useState<InstanceMetrics>({});
  const [openMobileMenu, setOpenMobileMenu] = useState(false);

  const navigate = useNavigate();
  const email = useAppSelector(selectEmail);
  const userPlan = useAppSelector(selectUserPlan);
  const userName = useAppSelector(selectUsername);

  useEffect(() => {
    try {
      Storage.list(`${userName}/projects/`, { pageSize: 1000 }).then(
        async (data) => {
          let projectData: any[] = [];
          const { results } = data;
          const projects: any[] = [];
          results.forEach((result) => {
            if (result.key?.includes("info.json")) {
              projects.push(result);
            }
          });
          const promises = projects.map(async (project) => {
            let info: any = {};
            const infoData = await Storage.get(project.key, {
              download: true,
              cacheControl: "no-cache",
            });
            if (infoData.Body) {
              const dataBody: any = infoData.Body;
              const dataString = await dataBody.text();
              const json = JSON.parse(dataString);
              info = json;
            }
            const projectData = {
              id: project.key.split("/").at(-2),
              lastModified: project.lastModified,
              ...info,
            };
            return projectData;
          });
          projectData = await Promise.all(promises);

          projectData.sort(
            (a, b) =>
              new Date(b.lastModified).getTime() -
              new Date(a.lastModified).getTime()
          );

          setProjects(projectData);
          setIsQuerying(false);
        }
      );
    } catch (e) {
      console.log(e);
    }
  }, []);

  useEffect(() => {
    document.title = `Overview | SCULVATE`;
  });

  useEffect(() => {
    const getMetrics = async () => {
      const response = await api.post("/instance_metrics", {});
      if (response?.data !== undefined && response?.data !== null) {
        setInstanceMetrics(response.data);
        setIsQueryingMetrics(false);
      }
    };

    getMetrics();

    const intervalId = setInterval(() => {
      getMetrics();
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  function getStatusColor(status: string, tailwind: boolean = false) {
    if (status.includes("Initializing...")) {
      return tailwind ? "warning" : "#B54708";
    } else if (status.includes("Active")) {
      return tailwind ? "success" : "#027A48";
    } else {
      return tailwind ? "gray" : "#344054";
    }
  }

  return (
    <>
      <div className="bg-gray-100 bg-gray-500 text-gray-700 bg-success-100 bg-success-500 text-success-700 bg-error-100 bg-error-500 text-error-700 bg-warning-100 bg-warning-500 text-warning-700"></div>
      <div className="flex w-full overflow-hidden">
        <div
          className={
            openMobileMenu
              ? "fixed min-[1200px]:relative translate-x-0 min-[1200px]:translate-x-0 z-40 transition-all duration-300"
              : "fixed min-[1200px]:relative -translate-x-full min-[1200px]:translate-x-0 z-40 transition-all duration-300"
          }
        >
          {/* SIDEBAR */}
          <aside
            className="font-inter w-80 min-h-screen overflow-y-auto touch-auto border-r-2 border-gray-200 z-30 relative"
            aria-label="Sidebar"
          >
            <div className="overflow-y-auto bg-white flex flex-col h-screen">
              {/* LOGO */}
              <div className="pt-[27px]">
                <svg
                  className="mx-auto"
                  width="90"
                  height="37"
                  viewBox="0 0 166 69"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M9.536 67.104C11.2427 67.7867 13.056 68.128 14.976 68.128C16.8533 68.128 18.688 67.7013 20.48 66.848C22.272 65.9947 23.872 64.8 25.28 63.264C26.7307 61.6853 27.8827 59.808 28.736 57.632C29.5893 55.456 30.016 53.0453 30.016 50.4C30.016 46.7733 29.3333 43.7013 27.968 41.184C26.6027 38.624 24.7893 36.6827 22.528 35.36C20.3093 33.9947 17.92 33.312 15.36 33.312C13.0987 33.312 11.136 33.7813 9.472 34.72C7.85067 35.616 6.61334 36.5547 5.76 37.536V20H0V67.36H5.376V64.608C6.48533 65.5467 7.872 66.3787 9.536 67.104ZM18.944 61.472C17.3653 62.496 15.5307 63.008 13.44 63.008C11.9467 63.008 10.5387 62.7733 9.216 62.304C7.89333 61.8347 6.74133 61.216 5.76 60.448V42.656C6.528 41.5893 7.63734 40.608 9.088 39.712C10.5813 38.7733 12.2453 38.304 14.08 38.304C15.9147 38.304 17.5787 38.7947 19.072 39.776C20.608 40.7573 21.824 42.1653 22.72 44C23.6587 45.8347 24.128 48.032 24.128 50.592C24.128 53.0667 23.6587 55.2427 22.72 57.12C21.824 58.9973 20.5653 60.448 18.944 61.472ZM42.8 67.04C44.3787 67.7653 46.1493 68.128 48.112 68.128C49.4773 68.128 50.7147 68 51.824 67.744C52.976 67.488 53.936 67.1893 54.704 66.848L53.296 62.176C52.7413 62.432 52.0587 62.6667 51.248 62.88C50.48 63.0507 49.6907 63.136 48.88 63.136C47.1733 63.136 45.8293 62.5813 44.848 61.472C43.9093 60.3627 43.44 58.656 43.44 56.352V20H37.68V56.928C37.68 59.5733 38.128 61.728 39.024 63.392C39.9627 65.056 41.2213 66.272 42.8 67.04ZM60.125 34.08V67.36H65.885V34.08H60.125ZM80.157 64.992C82.0343 67.0827 84.573 68.128 87.773 68.128C89.3517 68.128 90.8663 67.872 92.317 67.36C93.7677 66.8907 94.9197 66.4 95.773 65.888L94.173 61.28C93.3623 61.7493 92.4663 62.1547 91.485 62.496C90.5463 62.8373 89.5437 63.008 88.477 63.008C87.0263 63.008 85.7677 62.5173 84.701 61.536C83.677 60.5547 83.165 58.8267 83.165 56.352V40.288H92.381V35.296H83.165V24.8H78.749L77.533 35.296H71.645V40.288H77.405V55.904C77.405 59.8293 78.3223 62.8587 80.157 64.992ZM103.035 66.848C103.888 67.7013 104.891 68.128 106.043 68.128C107.28 68.128 108.304 67.744 109.115 66.976C109.925 66.1653 110.331 65.12 110.331 63.84C110.331 62.688 109.882 61.6853 108.987 60.832C108.133 59.9787 107.152 59.552 106.043 59.552C104.72 59.552 103.674 59.936 102.907 60.704C102.139 61.472 101.755 62.5173 101.755 63.84C101.755 64.992 102.181 65.9947 103.035 66.848ZM124.309 66.016C126.57 67.424 129.088 68.128 131.861 68.128C134.464 68.128 136.597 67.5733 138.261 66.464C139.968 65.312 141.312 64.0533 142.293 62.688C143.146 66.016 145.621 67.68 149.717 67.68L150.933 63.2C149.994 63.2 149.12 62.9653 148.309 62.496C147.541 61.984 147.157 60.9173 147.157 59.296V34.08H141.909V36.768C140.757 35.7867 139.392 34.976 137.813 34.336C136.277 33.6533 134.549 33.312 132.629 33.312C129.557 33.312 126.826 34.1013 124.437 35.68C122.09 37.216 120.234 39.3067 118.869 41.952C117.546 44.5973 116.885 47.584 116.885 50.912C116.885 54.4107 117.546 57.4613 118.869 60.064C120.234 62.624 122.048 64.608 124.309 66.016ZM137.749 61.856C136.298 62.624 134.762 63.008 133.141 63.008C131.178 63.008 129.408 62.496 127.829 61.472C126.25 60.4053 125.013 58.9547 124.117 57.12C123.221 55.2427 122.773 53.1093 122.773 50.72C122.773 48.2453 123.221 46.0907 124.117 44.256C125.013 42.3787 126.229 40.928 127.765 39.904C129.344 38.8373 131.157 38.304 133.205 38.304C134.741 38.304 136.192 38.56 137.557 39.072C138.965 39.5413 140.245 40.1813 141.397 40.992V58.848C140.416 60.0427 139.2 61.0453 137.749 61.856ZM158.625 27.168C159.436 27.9787 160.396 28.384 161.505 28.384C162.742 28.384 163.724 28.0213 164.449 27.296C165.174 26.528 165.537 25.5467 165.537 24.352C165.537 23.2427 165.132 22.304 164.321 21.536C163.553 20.7253 162.614 20.32 161.505 20.32C160.268 20.32 159.286 20.6827 158.561 21.408C157.836 22.1333 157.473 23.1147 157.473 24.352C157.473 25.4187 157.857 26.3573 158.625 27.168ZM158.625 34.08V67.36H164.385V34.08H158.625Z"
                    fill="url(#paint0_radial_15_2)"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M50.2536 3.13829C58.2895 -0.566264 67.6983 -0.566523 75.7351 3.13996L72.3634 7.15819C66.3789 4.75576 59.6101 4.75562 53.6256 7.15691L50.2536 3.13829ZM47.5354 4.56599C45.875 5.55101 44.2935 6.70901 42.8185 8.03999C42.3919 8.42498 42.3835 9.07686 42.7961 9.47624L44.9896 11.5994C45.383 11.9806 46.0159 11.9887 46.4246 11.6231C47.7938 10.3994 49.2721 9.35489 50.8277 8.48958L47.5354 4.56599ZM75.1611 8.49125L78.4531 4.56803C80.1121 5.55256 81.6924 6.70987 83.1664 8.03999C83.5931 8.42498 83.6014 9.07686 83.1895 9.47624L80.996 11.5994C80.6026 11.98 79.9697 11.9887 79.561 11.6231C78.1927 10.4002 76.7154 9.3562 75.1611 8.49125ZM58.8925 24.36C58.8925 22.1506 60.7279 20.36 62.9925 20.36C65.2571 20.36 67.0925 22.1506 67.0925 24.36C67.0925 26.5694 65.2571 28.36 62.9925 28.36C60.7279 28.36 58.8925 26.5694 58.8925 24.36ZM64.4925 10.4156C68.6282 10.7213 72.6825 12.294 75.976 15.1356C76.4174 15.5162 76.4321 16.1787 76.0119 16.5825L73.8056 18.7069C73.4212 19.0775 72.8024 19.1019 72.393 18.7569C70.1093 16.8305 67.3377 15.7223 64.4925 15.4346V10.4156ZM61.4925 10.4156C57.3551 10.7217 53.3004 12.2957 50.0089 15.1356C49.5669 15.5169 49.5528 16.1787 49.9724 16.5825L52.1787 18.7069C52.5631 19.0769 53.1819 19.1019 53.5913 18.7569C55.8781 16.8283 58.6496 15.7215 61.4925 15.4344V10.4156Z"
                    fill="url(#paint1_radial_15_2)"
                  />
                  <defs>
                    <radialGradient
                      id="paint0_radial_15_2"
                      cx="0"
                      cy="0"
                      r="1"
                      gradientUnits="userSpaceOnUse"
                      gradientTransform="translate(-3.49999 69.4575) rotate(-11.8452) scale(174.721 157.646)"
                    >
                      <stop stopColor="#7000FF" />
                      <stop offset="1" stopColor="#FF0094" />
                    </radialGradient>
                    <radialGradient
                      id="paint1_radial_15_2"
                      cx="0"
                      cy="0"
                      r="1"
                      gradientUnits="userSpaceOnUse"
                      gradientTransform="translate(41.6256 29.1334) rotate(-26.2272) scale(47.2138 84.0633)"
                    >
                      <stop stopColor="#7000FF" />
                      <stop offset="1" stopColor="#FF0094" />
                    </radialGradient>
                  </defs>
                </svg>
              </div>
              <div className="flex flex-col justify-between h-full">
                {/* LINKS LIST */}
                <ul className="pt-9 px-4 space-y-1">
                  {/* LINK */}
                  <li>
                    <a
                      href="#abc"
                      className="hover:bg-gray-50 active:bg-gray-100 px-3 py-2 flex items-center justify-between rounded-md"
                    >
                      <span className="flex items-center">
                        <div className="w-6 h-6">
                          <svg
                            width="20"
                            height="21"
                            viewBox="0 0 20 21"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="mx-auto"
                          >
                            <path
                              d="M6 16H14M9.0177 1.76403L2.23539 7.03916C1.78202 7.39178 1.55534 7.56809 1.39203 7.78889C1.24737 7.98447 1.1396 8.20481 1.07403 8.43908C1 8.70355 1 8.99073 1 9.56508V16.8C1 17.9201 1 18.4802 1.21799 18.908C1.40973 19.2843 1.71569 19.5903 2.09202 19.782C2.51984 20 3.07989 20 4.2 20H15.8C16.9201 20 17.4802 20 17.908 19.782C18.2843 19.5903 18.5903 19.2843 18.782 18.908C19 18.4802 19 17.9201 19 16.8V9.56508C19 8.99073 19 8.70355 18.926 8.43908C18.8604 8.20481 18.7526 7.98447 18.608 7.78889C18.4447 7.56809 18.218 7.39178 17.7646 7.03916L10.9823 1.76403C10.631 1.49078 10.4553 1.35415 10.2613 1.30163C10.0902 1.25529 9.9098 1.25529 9.73865 1.30163C9.54468 1.35415 9.36902 1.49078 9.0177 1.76403Z"
                              stroke="#667085"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>

                        <span className="ml-3 text-md font-semibold text-gray-700">
                          Home
                        </span>
                      </span>
                    </a>
                  </li>

                  {/* LINK */}
                  <li>
                    <a
                      href="overview"
                      className="bg-gray-50 hover:bg-gray-100 active:bg-gray-200 px-3 py-2 flex items-center justify-between rounded-md"
                    >
                      <span className="flex items-center">
                        <div className="w-6 h-6">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="mx-auto"
                          >
                            <path
                              d="M6 13V15M10 9V15M14 5V15M5.8 19H14.2C15.8802 19 16.7202 19 17.362 18.673C17.9265 18.3854 18.3854 17.9265 18.673 17.362C19 16.7202 19 15.8802 19 14.2V5.8C19 4.11984 19 3.27976 18.673 2.63803C18.3854 2.07354 17.9265 1.6146 17.362 1.32698C16.7202 1 15.8802 1 14.2 1H5.8C4.11984 1 3.27976 1 2.63803 1.32698C2.07354 1.6146 1.6146 2.07354 1.32698 2.63803C1 3.27976 1 4.11984 1 5.8V14.2C1 15.8802 1 16.7202 1.32698 17.362C1.6146 17.9265 2.07354 18.3854 2.63803 18.673C3.27976 19 4.11984 19 5.8 19Z"
                              stroke="black"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>

                        <span className="ml-3 text-md font-semibold text-gray-900">
                          Overview
                        </span>
                      </span>
                    </a>
                  </li>

                  {/* LINK */}
                  <li>
                    <a
                      href="projects"
                      className="hover:bg-gray-50 active:bg-gray-100 px-3 py-2 flex items-center justify-between rounded-md"
                    >
                      <span className="flex items-center">
                        <div className="w-6 h-6">
                          <svg
                            width="22"
                            height="22"
                            viewBox="0 0 22 22"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="mx-auto"
                          >
                            <path
                              d="M1 11L10.6422 15.8211C10.7734 15.8867 10.839 15.9195 10.9078 15.9324C10.9687 15.9438 11.0313 15.9438 11.0922 15.9324C11.161 15.9195 11.2266 15.8867 11.3578 15.8211L21 11M1 16L10.6422 20.8211C10.7734 20.8867 10.839 20.9195 10.9078 20.9324C10.9687 20.9438 11.0313 20.9438 11.0922 20.9324C11.161 20.9195 11.2266 20.8867 11.3578 20.8211L21 16M1 6L10.6422 1.17889C10.7734 1.1133 10.839 1.0805 10.9078 1.0676C10.9687 1.05616 11.0313 1.05616 11.0922 1.0676C11.161 1.0805 11.2266 1.1133 11.3578 1.17889L21 6L11.3578 10.8211C11.2266 10.8867 11.161 10.9195 11.0922 10.9324C11.0313 10.9438 10.9687 10.9438 10.9078 10.9324C10.839 10.9195 10.7734 10.8867 10.6422 10.8211L1 6Z"
                              stroke="#667085"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>

                        <span className="ml-3 text-md font-semibold text-gray-700">
                          Projects
                        </span>
                      </span>

                      <div className=" w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                        {isQuerying ? "-" : projects.length}
                      </div>
                    </a>
                  </li>
                </ul>

                {/* FOOTER */}
                <footer className="flex flex-col px-4 pb-8 space-y-6">
                  <ul className="space-y-1">
                    {/* LINK */}
                    <li>
                      <a
                        href="#abc"
                        className="hover:bg-gray-50 active:bg-gray-100 px-3 py-2 flex items-center justify-between rounded-md"
                      >
                        <span className="flex items-center">
                          <div className="w-6 h-6">
                            <svg
                              width="20"
                              height="22"
                              viewBox="0 0 20 22"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="mx-auto"
                            >
                              <path
                                d="M18.7778 21C18.7778 19.4494 18.7778 18.6741 18.5864 18.0432C18.1555 16.6227 17.0439 15.5112 15.6235 15.0803C14.9926 14.8889 14.2173 14.8889 12.6667 14.8889H7.11112C5.56049 14.8889 4.78517 14.8889 4.15429 15.0803C2.73384 15.5112 1.62227 16.6227 1.19138 18.0432C1 18.6741 1 19.4494 1 21M14.8889 6C14.8889 8.76142 12.6503 11 9.88889 11C7.12747 11 4.88889 8.76142 4.88889 6C4.88889 3.23858 7.12747 1 9.88889 1C12.6503 1 14.8889 3.23858 14.8889 6Z"
                                stroke="#667085"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>

                          <span className="ml-3 text-md font-semibold text-gray-700">
                            Account
                          </span>
                        </span>
                      </a>
                    </li>

                    {/* LINK */}
                    <li>
                      <a
                        href="#abc"
                        className="hover:bg-gray-50 active:bg-gray-100 px-3 py-2 flex items-center justify-between rounded-md"
                      >
                        <span className="flex items-center">
                          <div className="w-6 h-6">
                            <svg
                              width="22"
                              height="22"
                              viewBox="0 0 22 22"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className="mx-auto"
                            >
                              <path
                                d="M8.13626 8.13628L3.92893 3.92896M3.92893 18.0711L8.16797 13.8321M13.8611 13.8638L18.0684 18.0711M18.0684 3.92896L13.8287 8.16862M21 11C21 16.5228 16.5228 21 11 21C5.47715 21 1 16.5228 1 11C1 5.47715 5.47715 1 11 1C16.5228 1 21 5.47715 21 11ZM15 11C15 13.2091 13.2091 15 11 15C8.79086 15 7 13.2091 7 11C7 8.79086 8.79086 7 11 7C13.2091 7 15 8.79086 15 11Z"
                                stroke="#667085"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>

                          <span className="ml-3 text-md font-semibold text-gray-700">
                            Support
                          </span>
                        </span>
                      </a>
                    </li>
                  </ul>
                  <div className="pt-6 border-t border-gray-200 pl-2 pr-2.5">
                    <div className="flex justify-between">
                      <div className="flex flex-col text-sm">
                        <h6 className="font-semibold text-gray-700">
                          {userPlan || "Unknown plan"}
                        </h6>
                        <h6 className="text-gray-600">{email}</h6>
                      </div>
                      <button
                        className="w-5 h-5"
                        onClick={() => {
                          setIsLoading(true);
                          Auth.signOut().then(() => {
                            localStorage.clear();
                            setIsLoading(false);
                            navigate("/", { replace: true });
                          });
                        }}
                      >
                        {isLoading ? (
                          <svg
                            aria-hidden="true"
                            className="w-5 h-5 animate-spin fill-[#7f56d9] text-white"
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
                        ) : (
                          <>
                            <span
                              data-tooltip-id="logout-tooltip"
                              data-tooltip-content="Log out"
                            >
                              <svg
                                className="w-4 h-4"
                                width="18"
                                height="18"
                                viewBox="0 0 18 18"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M12.3333 13.1667L16.5 9M16.5 9L12.3333 4.83333M16.5 9H6.5M6.5 1.5H5.5C4.09987 1.5 3.3998 1.5 2.86502 1.77248C2.39462 2.01217 2.01217 2.39462 1.77248 2.86502C1.5 3.3998 1.5 4.09987 1.5 5.5V12.5C1.5 13.9001 1.5 14.6002 1.77248 15.135C2.01217 15.6054 2.39462 15.9878 2.86502 16.2275C3.3998 16.5 4.09987 16.5 5.5 16.5H6.5"
                                  stroke="#667085"
                                  strokeWidth="1.66667"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                            <Tooltip id="logout-tooltip" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </footer>
              </div>
            </div>
          </aside>

          <div
            style={{ display: openMobileMenu ? "flex" : "none" }}
            className="z-40 absolute top-0 -right-[30px] bg-white border-r-white border-2 border-[#EAECF0] w-8 h-8 -scale-100 flex min-[1586px]:hidden items-center justify-center rounded-tl-md rounded-bl-md"
            onClick={() => setOpenMobileMenu(false)}
          >
            <MyIcon name="right-arrow" color="#667085" />
          </div>

          <div
            style={{ display: openMobileMenu ? "block" : "none" }}
            className="absolute inset-0 w-[800vw] h-screen bg-black opacity-40"
            onClick={() => setOpenMobileMenu(false)}
          ></div>
        </div>

        <div className="bg-gray-25 w-full">
          {/* HEADER */}
          <div className="py-8">
            <div className="px-8 flex flex-col space-y-5">
              <div className="flex items-center justify-start gap-4">
                <div
                  className="min-[1200px]:hidden flex items-center justify-center cursor-pointer"
                  onClick={() => setOpenMobileMenu(true)}
                >
                  <MyIcon name="menu" />
                </div>
                {/* BREADCRUM */}
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 flex items-center justify-center">
                    <svg
                      width="20"
                      height="21"
                      viewBox="0 0 20 21"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="mx-auto"
                    >
                      <path
                        d="M6 16H14M9.0177 1.76403L2.23539 7.03916C1.78202 7.39178 1.55534 7.56809 1.39203 7.78889C1.24737 7.98447 1.1396 8.20481 1.07403 8.43908C1 8.70355 1 8.99073 1 9.56508V16.8C1 17.9201 1 18.4802 1.21799 18.908C1.40973 19.2843 1.71569 19.5903 2.09202 19.782C2.51984 20 3.07989 20 4.2 20H15.8C16.9201 20 17.4802 20 17.908 19.782C18.2843 19.5903 18.5903 19.2843 18.782 18.908C19 18.4802 19 17.9201 19 16.8V9.56508C19 8.99073 19 8.70355 18.926 8.43908C18.8604 8.20481 18.7526 7.98447 18.608 7.78889C18.4447 7.56809 18.218 7.39178 17.7646 7.03916L10.9823 1.76403C10.631 1.49078 10.4553 1.35415 10.2613 1.30163C10.0902 1.25529 9.9098 1.25529 9.73865 1.30163C9.54468 1.35415 9.36902 1.49078 9.0177 1.76403Z"
                        stroke="#667085"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div className="w-4 h-4 flex items-center justify-center">
                    <svg
                      width="6"
                      height="10"
                      viewBox="0 0 6 10"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="mx-auto"
                    >
                      <path
                        d="M1 9L5 5L1 1"
                        stroke="#D0D5DD"
                        strokeWidth="1.33333"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <span className="my-auto px-2 py-1 flex text-sm items-center bg-grayIron-100 justify-center rounded focus:outline-none text-gray-600 font-semibold">
                    Overview
                  </span>
                </div>
              </div>

              {/* CONTENT */}
              <div className="flex flex-col space-y-1">
                <h4 className=" text-tsm text-gray-900 font-semibold">
                  Overview
                </h4>
                <h6 className=" text-md text-gray-600">
                  View the status of your compute nodes.
                </h6>
              </div>

              <div className="border-b border-gray-200"></div>
            </div>
          </div>

          {isQueryingMetrics ? (
            <div>
              <div className="ml-4">
                <svg
                  aria-hidden="true"
                  className="w-8 h-8 ml-8 animate-spin fill-[#667085] text-gray-25"
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
              </div>
            </div>
          ) : !isQueryingMetrics &&
            Object.keys(instanceMetrics).length === 0 ? (
            <div>
              <div>
                <div className="ml-8 flex space-x-1">
                  <span className="text-gray-600">
                    No compute instances found.
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div
            className="px-8 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            style={{ backgroundColor: "#FCFCFD" }}
          >
            {Object.entries(instanceMetrics).map(([instanceId, metrics]) => (
              <div
                key={instanceId}
                className="bg-gradient-to-bl from-primary-50 to-blue-25 border border-gray-200 shadow-md rounded-xl p-6 transition-transform transform hover:scale-105 backdrop-blur-md"
              >
                <div className="flex justify-between items-center mb-4">
                  <p className="font-bold text-base text-gray-800">
                    Instance {instanceId}{" "}
                    <span className="font-normal">
                      ({metrics.cpu.cores} vCPUs
                      {metrics.memory.memory !== 0 &&
                        `, ${metrics.memory.memory} GB`}
                      )
                    </span>
                  </p>
                  <div className="flex items-center">
                    <div
                      className={`flex items-center bg-${getStatusColor(
                        metrics.status,
                        true
                      )}-100 py-0.5 pr-2 pl-1.5 mix-blend-multiply rounded-2xl`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full bg-${getStatusColor(
                          metrics.status,
                          true
                        )}-500`}
                      ></div>
                      <div
                        className={`text-sm font-medium ml-1.5 text-${getStatusColor(
                          metrics.status,
                          true
                        )}-700`}
                      >
                        {metrics.status}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mb-2 font-normal text-gray-700">
                  <span className="font-medium text-gray-600">
                    CPU utilization:
                  </span>{" "}
                  {metrics.cpu.utilization}%
                </p>
                <div className="mb-6 overflow-hidden h-2 text-xs flex rounded-md bg-[#EAECF0]">
                  <div
                    style={{
                      width: `${Math.max(metrics.cpu.utilization, 2.5)}%`,
                    }}
                    className="rounded-md shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-rose-600"
                  ></div>
                </div>
                <p className="mb-2 font-normal text-gray-700">
                  <span className="font-medium text-gray-600">
                    Memory utilization:
                  </span>{" "}
                  {metrics.memory.utilization}%
                </p>
                <div className="overflow-hidden h-2 text-xs flex rounded-md bg-[#EAECF0]">
                  <div
                    style={{
                      width: `${Math.max(metrics.memory.utilization, 2.5)}%`,
                    }}
                    className="rounded-md shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-greenLight-600"
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default Overview;
