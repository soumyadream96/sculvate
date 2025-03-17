import React, { useEffect, useState} from "react";
import { Provider } from "react-redux";
import store from "./state/index";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Landing from "pages/LandingPage";
import Login from "pages/Login";
// import Overview from "pages/Overview";
// import Projects from "pages/Projects";
import Signup from "pages/Signup";
// import Project from "pages/ProjectPage";
// import Verification from "pages/Verification";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {  PublicComponent } from "components/AccessComponent";

const queryClient = new QueryClient();

// const RedirectToHome = () => {
//   const navigate = useNavigate();

//   useEffect(() => {
//     navigate("/");
//   }, [navigate]);

//   return null;
// };

interface StaticPageProps {
  htmlPath: string;
}

const StaticPage: React.FC<StaticPageProps> = ({ htmlPath }) => {
  const [content, setContent] = useState("");

  useEffect(() => {
    fetch(htmlPath)
      .then((response) => response.text())
      .then((data) => setContent(data))
      .catch((error) => console.error("Error fetching static page:", error));
  }, [htmlPath]);

  return <div dangerouslySetInnerHTML={{ __html: content }} />;
};

const App = () => {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route
              index
              element={
                <PublicComponent>
                  <Landing />
                </PublicComponent>
              }
            />
            <Route
              path="/login"
              element={
                <PublicComponent>
                  <Login />
                </PublicComponent>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicComponent>
                  <Signup />
                </PublicComponent>
              }
            />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
};

export default App;
