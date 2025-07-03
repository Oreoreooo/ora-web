#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
163邮箱SMTP测试脚本
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

def test_163_smtp():
    """测试163邮箱SMTP连接"""
    
    # 配置信息
    MAIL_SERVER = "smtp.163.com"
    MAIL_PORT = 465  # SSL端口
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    
    print(f"测试163邮箱SMTP连接...")
    print(f"服务器: {MAIL_SERVER}:{MAIL_PORT}")
    print(f"用户名: {MAIL_USERNAME}")
    print(f"密码: {'*' * len(MAIL_PASSWORD) if MAIL_PASSWORD else 'None'}")
    
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        print("❌ 邮箱配置不完整，请检查.env文件")
        return False
    
    try:
        # 创建SSL连接
        print("🔗 正在连接到163邮箱服务器...")
        server = smtplib.SMTP_SSL(MAIL_SERVER, MAIL_PORT, timeout=30)
        
        # 启用调试
        server.set_debuglevel(1)
        
        # 登录
        print("🔐 正在登录...")
        server.login(MAIL_USERNAME, MAIL_PASSWORD)
        
        # 创建测试邮件
        msg = MIMEMultipart()
        msg['From'] = MAIL_USERNAME
        msg['To'] = MAIL_USERNAME  # 发送给自己
        msg['Subject'] = "163邮箱SMTP测试"
        
        body = "这是一封测试邮件，用于验证163邮箱SMTP配置是否正确。"
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        
        # 发送邮件
        print("📧 正在发送测试邮件...")
        text = msg.as_string()
        server.sendmail(MAIL_USERNAME, MAIL_USERNAME, text)
        
        # 关闭连接
        server.quit()
        
        print("✅ 163邮箱SMTP测试成功！")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"❌ SMTP认证失败: {e}")
        print("请检查:")
        print("1. 邮箱用户名是否正确")
        print("2. 是否使用了授权码而不是邮箱密码")
        print("3. 是否开启了SMTP服务")
        return False
        
    except smtplib.SMTPConnectError as e:
        print(f"❌ SMTP连接失败: {e}")
        print("请检查网络连接和服务器设置")
        return False
        
    except Exception as e:
        print(f"❌ 发送邮件失败: {e}")
        return False

if __name__ == "__main__":
    test_163_smtp()
