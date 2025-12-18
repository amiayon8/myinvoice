
import React, { useState } from 'react';
import { supabase, BUCKETS } from '../supabaseClient';

interface LogoUploadProps {
    currentUrl?: string;
    onUploadSuccess: (url: string) => void;
    userId: string;
}

export const LogoUpload: React.FC<LogoUploadProps> = ({ currentUrl, onUploadSuccess, userId }) => {
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}/${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { data: ddata, error: uploadError } = await supabase.storage
                .from(BUCKETS.LOGOS)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type // Explicitly set content type (image/png, etc.)
                });
            console.log(ddata)

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from(BUCKETS.LOGOS)
                .getPublicUrl(filePath);

            console.log(data)

            onUploadSuccess(data.publicUrl);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 border-2 border-slate-200 dark:border-slate-700 border-dashed rounded-lg">
            {currentUrl ? (
                <div className="group relative">
                    <img src={currentUrl} alt="Company Logo" className="bg-white shadow-sm p-2 rounded-lg w-24 h-24 object-contain" />
                    <div className="absolute inset-0 flex justify-center items-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity">
                        <label className="font-bold text-white text-xs cursor-pointer">
                            Change
                            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                        </label>
                    </div>
                </div>
            ) : (
                <label className="flex flex-col justify-center items-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg w-24 h-24 transition-colors cursor-pointer">
                    <div className="flex flex-col justify-center items-center pt-5 pb-6">
                        <i className={`fa-solid ${uploading ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'} text-slate-400 text-xl`}></i>
                        <p className="mt-2 font-bold text-[10px] text-slate-500 uppercase tracking-tighter">Upload Logo</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                </label>
            )}
            <p className="font-medium text-[9px] text-slate-400 dark:text-slate-500 text-center uppercase tracking-widest">PNG, JPG up to 2MB</p>
        </div>
    );
};
