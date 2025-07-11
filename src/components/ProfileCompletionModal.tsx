// src/components/ProfileCompletionModal.tsx - REVISED (Refined props)
'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import Link from 'next/link';
import { PROFILE_APPROVAL_STRICT_MODE } from '@/config/constants';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isProfileIncomplete: boolean; // Indicates if fields are missing
  isProfilePendingApproval: boolean; // Indicates if profile is complete but unapproved (though use case for this modal is primarily for incomplete)
}

export default function ProfileCompletionModal({
  isOpen,
  onClose,
  isProfileIncomplete,
  isProfilePendingApproval,
}: ProfileCompletionModalProps) {
  const router = useRouter();

  // Determine content based on props
  const title = isProfileIncomplete ? 'Complete Your Profile' : 'Profile Status'; // Fallback title
  const description = isProfileIncomplete
    ? 'Please complete your profile details to gain full access to the application. This is a one-time requirement.'
    : 'Your profile is awaiting administrator approval. You will have limited access until approved.'; // Fallback description

  const handleGoToProfile = () => {
    onClose(); // Close modal
    router.push('/profile'); // Redirect to profile page
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={isProfileIncomplete ? () => {} : onClose}> {/* Make it dismissible if not incomplete */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  {title}
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {description}
                  </p>
                </div>

                <div className="mt-4 flex justify-end space-x-2">
                  {isProfileIncomplete && (
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={handleGoToProfile}
                    >
                      Go to Profile Page
                    </button>
                  )}
                  {!isProfileIncomplete && isProfilePendingApproval && ( // Only show "Understood" if it's just about approval, not completion
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-900 hover:bg-yellow-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2"
                      onClick={onClose}
                    >
                      Understood
                    </button>
                  )}
                  {/* If neither (shouldn't happen if modal is open), or for general dismissal */}
                  {(!isProfileIncomplete && !isProfilePendingApproval && !PROFILE_APPROVAL_STRICT_MODE) && (
                       <button
                       type="button"
                       className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                       onClick={onClose}
                     >
                       Close
                     </button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}


// // src/components/ProfileCompletionModal.tsx
// 'use client';

// import { Dialog, Transition } from '@headlessui/react';
// import { Fragment, useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { logger } from '@/lib/logger';
// import Link from 'next/link';

// interface ProfileCompletionModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   isProfileIncomplete: boolean;
//   isProfilePendingApproval: boolean;
// }

// export default function ProfileCompletionModal({
//   isOpen,
//   onClose,
//   isProfileIncomplete,
//   isProfilePendingApproval,
// }: ProfileCompletionModalProps) {
//   const router = useRouter();

//   const title = isProfileIncomplete ? 'Complete Your Profile' : 'Profile Pending Approval';
//   const description = isProfileIncomplete
//     ? 'Please complete your profile details to gain full access to the application. You will be redirected to the profile page.'
//     : 'Your profile has been submitted and is awaiting approval from an administrator. You may have limited access until it is approved.';

//   const handleGoToProfile = () => {
//     onClose(); // Close modal
//     router.push('/profile'); // Redirect to profile page
//   };

//   return (
//     <Transition appear show={isOpen} as={Fragment}>
//       <Dialog as="div" className="relative z-10" onClose={onClose}>
//         <Transition.Child
//           as={Fragment}
//           enter="ease-out duration-300"
//           enterFrom="opacity-0"
//           enterTo="opacity-100"
//           leave="ease-in duration-200"
//           leaveFrom="opacity-100"
//           leaveTo="opacity-0"
//         >
//           <div className="fixed inset-0 bg-black bg-opacity-25" />
//         </Transition.Child>

//         <div className="fixed inset-0 overflow-y-auto">
//           <div className="flex min-h-full items-center justify-center p-4 text-center">
//             <Transition.Child
//               as={Fragment}
//               enter="ease-out duration-300"
//               enterFrom="opacity-0 scale-95"
//               enterTo="opacity-100 scale-100"
//               leave="ease-in duration-200"
//               leaveFrom="opacity-100 scale-100"
//               leaveTo="opacity-0 scale-95"
//             >
//               <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
//                 <Dialog.Title
//                   as="h3"
//                   className="text-lg font-medium leading-6 text-gray-900"
//                 >
//                   {title}
//                 </Dialog.Title>
//                 <div className="mt-2">
//                   <p className="text-sm text-gray-500">
//                     {description}
//                   </p>
//                 </div>

//                 <div className="mt-4">
//                   {isProfileIncomplete && (
//                     <button
//                       type="button"
//                       className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
//                       onClick={handleGoToProfile}
//                     >
//                       Go to Profile Page
//                     </button>
//                   )}
//                   {isProfilePendingApproval && (
//                     <button
//                       type="button"
//                       className="inline-flex justify-center rounded-md border border-transparent bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-900 hover:bg-yellow-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2"
//                       onClick={onClose} // Just close, user waits for approval
//                     >
//                       Understood
//                     </button>
//                   )}
//                 </div>
//               </Dialog.Panel>
//             </Transition.Child>
//           </div>
//         </div>
//       </Dialog>
//     </Transition>
//   );
// }