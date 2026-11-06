import React, { createContext } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import UserStore from './dataStore/UserStore';
import NotificationStore from './dataStore/NotificationStore';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';

export const Context = createContext(null)

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <Context.Provider value={{
      user: new UserStore(),
      notification: new NotificationStore()
    }}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </Context.Provider>
  </BrowserRouter>
);